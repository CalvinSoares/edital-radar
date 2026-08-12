import { and, count, eq, gt, isNull, sql } from "drizzle-orm";
import type { db as Db } from "../cliente";
import { assinante, federacao, federacaoAssento, federacaoConvite } from "../schema";
import { obterOuCriarPorEmail } from "./assinantes";
import { definirPlano } from "./perfil";

export type FederacaoResumo = {
  id: string;
  nome: string;
  assentos: number;
  usados: number;
  adminAssinanteId: string;
};

export async function criarFederacao(
  db: typeof Db,
  input: { nome: string; adminAssinanteId: string; assentos: number },
): Promise<string> {
  const [criada] = await db
    .insert(federacao)
    .values({
      nome: input.nome.trim(),
      adminAssinanteId: input.adminAssinanteId,
      assentos: Math.max(1, Math.min(input.assentos, 500)),
    })
    .returning({ id: federacao.id });
  await definirPlano(db, input.adminAssinanteId, "federacao");
  // Admin ocupa 1 assento.
  await db.insert(federacaoAssento).values({
    federacaoId: criada!.id,
    assinanteId: input.adminAssinanteId,
  });
  return criada!.id;
}

export async function obterFederacaoDoAdmin(
  db: typeof Db,
  adminAssinanteId: string,
): Promise<FederacaoResumo | null> {
  const [row] = await db
    .select({
      id: federacao.id,
      nome: federacao.nome,
      assentos: federacao.assentos,
      adminAssinanteId: federacao.adminAssinanteId,
    })
    .from(federacao)
    .where(eq(federacao.adminAssinanteId, adminAssinanteId))
    .limit(1);
  if (!row) return null;
  const [usados] = await db
    .select({ n: count() })
    .from(federacaoAssento)
    .where(eq(federacaoAssento.federacaoId, row.id));
  return { ...row, usados: usados?.n ?? 0 };
}

export async function listarAssentos(db: typeof Db, federacaoId: string) {
  return db
    .select({
      assinanteId: federacaoAssento.assinanteId,
      email: assinante.email,
      plano: assinante.plano,
      desde: federacaoAssento.criadoEm,
    })
    .from(federacaoAssento)
    .innerJoin(assinante, eq(federacaoAssento.assinanteId, assinante.id))
    .where(eq(federacaoAssento.federacaoId, federacaoId));
}

export async function criarConviteFederacao(
  db: typeof Db,
  input: { federacaoId: string; email: string; criadoPorAssinanteId: string },
): Promise<string> {
  const fed = await obterFederacaoDoAdmin(db, input.criadoPorAssinanteId);
  if (!fed || fed.id !== input.federacaoId) throw new Error("NAO_ADMIN");
  if (fed.usados >= fed.assentos) throw new Error("SEM_ASSENTO");

  const [criado] = await db
    .insert(federacaoConvite)
    .values({
      federacaoId: input.federacaoId,
      email: input.email.trim().toLowerCase(),
      criadoPorAssinanteId: input.criadoPorAssinanteId,
      expiraEm: sql`now() + interval '14 days'`,
    })
    .returning({ id: federacaoConvite.id });
  return criado!.id;
}

export async function aceitarConviteFederacao(
  db: typeof Db,
  token: string,
): Promise<{ assinanteId: string; federacaoId: string } | null> {
  const [conv] = await db
    .select()
    .from(federacaoConvite)
    .where(
      and(
        eq(federacaoConvite.id, token),
        isNull(federacaoConvite.aceitoEm),
        gt(federacaoConvite.expiraEm, sql`now()`),
      ),
    )
    .limit(1);
  if (!conv) return null;

  const [fed] = await db
    .select({ assentos: federacao.assentos })
    .from(federacao)
    .where(eq(federacao.id, conv.federacaoId))
    .limit(1);
  const [usados] = await db
    .select({ n: count() })
    .from(federacaoAssento)
    .where(eq(federacaoAssento.federacaoId, conv.federacaoId));
  if (!fed || (usados?.n ?? 0) >= fed.assentos) return null;

  const assinanteId = await obterOuCriarPorEmail(db, conv.email);
  const [ja] = await db
    .select({ id: federacaoAssento.id })
    .from(federacaoAssento)
    .where(eq(federacaoAssento.assinanteId, assinanteId))
    .limit(1);

  if (ja) {
    await db
      .update(federacaoConvite)
      .set({ aceitoEm: sql`now()` })
      .where(eq(federacaoConvite.id, token));
    return { assinanteId, federacaoId: conv.federacaoId };
  }

  await db.insert(federacaoAssento).values({
    federacaoId: conv.federacaoId,
    assinanteId,
  });
  await definirPlano(db, assinanteId, "radar");
  await db
    .update(federacaoConvite)
    .set({ aceitoEm: sql`now()` })
    .where(eq(federacaoConvite.id, token));

  return { assinanteId, federacaoId: conv.federacaoId };
}

export async function listarFederacoesAdmin(db: typeof Db) {
  const rows = await db
    .select({
      id: federacao.id,
      nome: federacao.nome,
      assentos: federacao.assentos,
      adminEmail: assinante.email,
      criadoEm: federacao.criadoEm,
    })
    .from(federacao)
    .innerJoin(assinante, eq(federacao.adminAssinanteId, assinante.id));

  const comUsados = [];
  for (const r of rows) {
    const [u] = await db
      .select({ n: count() })
      .from(federacaoAssento)
      .where(eq(federacaoAssento.federacaoId, r.id));
    comUsados.push({ ...r, usados: u?.n ?? 0 });
  }
  return comUsados;
}
