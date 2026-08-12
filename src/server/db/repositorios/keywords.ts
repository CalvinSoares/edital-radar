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
