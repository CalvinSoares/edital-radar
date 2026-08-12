import { and, eq, isNull } from "drizzle-orm";
import type { db as Db } from "../cliente";
import { assinante, keyword } from "../schema";
import type { KeywordParaMatch } from "../../match/casar-keywords";

/** Keywords de assinantes ativos (suprimido/descadastrado nunca recebe). */
export async function listarKeywordsParaMatch(db: typeof Db): Promise<KeywordParaMatch[]> {
  const rows = await db
    .select({ id: keyword.id, assinanteId: keyword.assinanteId, termo: keyword.termo })
    .from(keyword)
    .innerJoin(assinante, eq(keyword.assinanteId, assinante.id))
    .where(and(isNull(assinante.suprimidoEm), isNull(assinante.descadastradoEm)));
  return rows;
}

export async function listarDoAssinante(db: typeof Db, assinanteId: string) {
  return db
    .select({ id: keyword.id, termo: keyword.termo, criadoEm: keyword.criadoEm })
    .from(keyword)
    .where(eq(keyword.assinanteId, assinanteId))
    .orderBy(keyword.criadoEm);
}

/** Idempotente: termo repetido não duplica (UNIQUE) e não é erro. */
export async function salvarKeyword(db: typeof Db, assinanteId: string, termo: string): Promise<void> {
  await db
    .insert(keyword)
    .values({ assinanteId, termo: termo.trim() })
    .onConflictDoNothing({ target: [keyword.assinanteId, keyword.termo] });
}

/** Escopada ao dono — ninguém remove keyword de outro assinante. */
export async function removerKeyword(db: typeof Db, assinanteId: string, id: string): Promise<void> {
  await db.delete(keyword).where(and(eq(keyword.id, id), eq(keyword.assinanteId, assinanteId)));
}
