import { and, count, eq, gt, isNull, sql } from "drizzle-orm";
import type { db as Db } from "../cliente";
import { assinante, equipe, equipeConvite, equipeMembro } from "../schema";
import { obterOuCriarPorEmail } from "./assinantes";
import { definirPlano } from "./perfil";

export const LIMITE_MEMBROS_EQUIPE = 3; // dono + 2

export type MembroDaEquipe = {
  assinanteId: string;
  email: string;
  papel: "dono" | "membro";
};

export async function garantirEquipeDoDono(
  db: typeof Db,
  donoAssinanteId: string,
  nome = "Minha ONG",
): Promise<string> {
  const [existente] = await db
    .select({ id: equipe.id })
    .from(equipe)
    .where(eq(equipe.donoAssinanteId, donoAssinanteId))
    .limit(1);
  if (existente) return existente.id;

  const [criada] = await db
    .insert(equipe)
    .values({ donoAssinanteId, nome })
    .returning({ id: equipe.id });
  await db.insert(equipeMembro).values({
    equipeId: criada!.id,
    assinanteId: donoAssinanteId,
    papel: "dono",
  });
  return criada!.id;
}

export async function obterEquipeDoAssinante(db: typeof Db, assinanteId: string) {
  const [row] = await db
    .select({
      equipeId: equipe.id,
      nome: equipe.nome,
      donoAssinanteId: equipe.donoAssinanteId,
      papel: equipeMembro.papel,
    })
    .from(equipeMembro)
    .innerJoin(equipe, eq(equipeMembro.equipeId, equipe.id))
    .where(eq(equipeMembro.assinanteId, assinanteId))
    .limit(1);
  return row ?? null;
}

export async function listarMembros(db: typeof Db, equipeId: string): Promise<MembroDaEquipe[]> {
  return db
    .select({
      assinanteId: equipeMembro.assinanteId,
      email: assinante.email,
      papel: equipeMembro.papel,
    })
    .from(equipeMembro)
    .innerJoin(assinante, eq(equipeMembro.assinanteId, assinante.id))
    .where(eq(equipeMembro.equipeId, equipeId));
}

/** IDs dos membros (exceto o próprio dono) — para fan-out de alertas. */
export async function listarMembrosParaFanOut(
  db: typeof Db,
  donoAssinanteId: string,
): Promise<string[]> {
  const eqp = await obterEquipeDoAssinante(db, donoAssinanteId);
  if (!eqp || eqp.donoAssinanteId !== donoAssinanteId) return [];
  const membros = await listarMembros(db, eqp.equipeId);
  return membros.filter((m) => m.papel === "membro").map((m) => m.assinanteId);
}

export async function contarMembros(db: typeof Db, equipeId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(equipeMembro)
    .where(eq(equipeMembro.equipeId, equipeId));
  return row?.n ?? 0;
}

export async function criarConviteEquipe(
  db: typeof Db,
  input: { equipeId: string; email: string; criadoPorAssinanteId: string },
): Promise<string> {
  const total = await contarMembros(db, input.equipeId);
  if (total >= LIMITE_MEMBROS_EQUIPE) {
    throw new Error("LIMITE_EQUIPE");
  }
  const email = input.email.trim().toLowerCase();
  const [criado] = await db
    .insert(equipeConvite)
    .values({
      equipeId: input.equipeId,
      email,
      criadoPorAssinanteId: input.criadoPorAssinanteId,
      expiraEm: sql`now() + interval '7 days'`,
    })
    .returning({ id: equipeConvite.id });
  return criado!.id;
}

/**
 * Aceita convite: cria/reativa assinante, sobe para radar se free, entra na equipe.
 */
export async function aceitarConviteEquipe(
  db: typeof Db,
  token: string,
): Promise<{ assinanteId: string; equipeId: string } | null> {
  const [conv] = await db
    .select()
    .from(equipeConvite)
    .where(
      and(
        eq(equipeConvite.id, token),
        isNull(equipeConvite.aceitoEm),
        gt(equipeConvite.expiraEm, sql`now()`),
      ),
    )
    .limit(1);
  if (!conv) return null;

  const total = await contarMembros(db, conv.equipeId);
  if (total >= LIMITE_MEMBROS_EQUIPE) return null;

  const assinanteId = await obterOuCriarPorEmail(db, conv.email);
  const [jaMembro] = await db
    .select({ id: equipeMembro.id })
    .from(equipeMembro)
    .where(eq(equipeMembro.assinanteId, assinanteId))
    .limit(1);
  if (jaMembro) {
    // Já em outra equipe — não move.
    return null;
  }

  const [plano] = await db
    .select({ plano: assinante.plano })
    .from(assinante)
    .where(eq(assinante.id, assinanteId))
    .limit(1);
  if (plano?.plano === "free") {
    await definirPlano(db, assinanteId, "radar");
  }

  await db.insert(equipeMembro).values({
    equipeId: conv.equipeId,
    assinanteId,
    papel: "membro",
  });
  await db
    .update(equipeConvite)
    .set({ aceitoEm: sql`now()` })
    .where(eq(equipeConvite.id, token));

  return { assinanteId, equipeId: conv.equipeId };
}

export async function removerMembro(
  db: typeof Db,
  equipeId: string,
  membroAssinanteId: string,
  solicitanteId: string,
): Promise<boolean> {
  const eqp = await db
    .select({ donoAssinanteId: equipe.donoAssinanteId })
    .from(equipe)
    .where(eq(equipe.id, equipeId))
    .limit(1);
  if (!eqp[0] || eqp[0].donoAssinanteId !== solicitanteId) return false;
  if (membroAssinanteId === solicitanteId) return false;

  const rem = await db
    .delete(equipeMembro)
    .where(
      and(
        eq(equipeMembro.equipeId, equipeId),
        eq(equipeMembro.assinanteId, membroAssinanteId),
        eq(equipeMembro.papel, "membro"),
      ),
    )
    .returning({ id: equipeMembro.id });
  return rem.length > 0;
}
