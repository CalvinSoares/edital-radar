import { and, desc, eq, inArray } from "drizzle-orm";
import type { db as Db } from "../cliente";
import { alerta, publicacao, salvo } from "../schema";

export async function salvarPublicacao(
  db: typeof Db,
  assinanteId: string,
  input: { publicacaoId: string; alertaId?: string | null },
): Promise<boolean> {
  const inseridos = await db
    .insert(salvo)
    .values({
      assinanteId,
      publicacaoId: input.publicacaoId,
      alertaId: input.alertaId ?? null,
    })
    .onConflictDoNothing({ target: [salvo.assinanteId, salvo.publicacaoId] })
    .returning({ id: salvo.id });
  return inseridos.length > 0;
}

/** Salva a partir de um alerta do próprio assinante. */
export async function salvarPorAlerta(
  db: typeof Db,
  assinanteId: string,
  alertaId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ publicacaoId: alerta.publicacaoId })
    .from(alerta)
    .where(and(eq(alerta.id, alertaId), eq(alerta.assinanteId, assinanteId)))
    .limit(1);
  if (!row) return false;
  await salvarPublicacao(db, assinanteId, { publicacaoId: row.publicacaoId, alertaId });
  return true;
}

export async function removerSalvo(
  db: typeof Db,
  assinanteId: string,
  salvoId: string,
): Promise<boolean> {
  const rem = await db
    .delete(salvo)
    .where(and(eq(salvo.id, salvoId), eq(salvo.assinanteId, assinanteId)))
    .returning({ id: salvo.id });
  return rem.length > 0;
}

export async function listarSalvos(db: typeof Db, assinanteId: string, limite = 50) {
  return db
    .select({
      id: salvo.id,
      titulo: publicacao.titulo,
      excerpt: publicacao.excerpt,
      slug: publicacao.slug,
      dataPublicacao: publicacao.dataPublicacao,
      salvoEm: salvo.criadoEm,
      alertaId: salvo.alertaId,
    })
    .from(salvo)
    .innerJoin(publicacao, eq(salvo.publicacaoId, publicacao.id))
    .where(eq(salvo.assinanteId, assinanteId))
    .orderBy(desc(salvo.criadoEm))
    .limit(Math.min(limite, 100));
}

export async function idsSalvosDeAlertas(
  db: typeof Db,
  assinanteId: string,
  alertaIds: string[],
): Promise<Set<string>> {
  if (alertaIds.length === 0) return new Set();
  const rows = await db
    .select({ alertaId: salvo.alertaId })
    .from(salvo)
    .where(and(eq(salvo.assinanteId, assinanteId), inArray(salvo.alertaId, alertaIds)));
  return new Set(rows.map((r) => r.alertaId).filter(Boolean) as string[]);
}
