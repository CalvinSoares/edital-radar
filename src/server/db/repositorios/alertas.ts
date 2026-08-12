import { inArray } from "drizzle-orm";
import type { db as Db } from "../cliente";
import { alerta, publicacao } from "../schema";
import type { ResultadoDeMatch } from "../../match/casar-keywords";

/**
 * Cria alertas a partir dos matches do dia. Dedup por
 * UNIQUE (assinante_id, publicacao_id) no banco — nunca em memória.
 * Devolve quantos realmente entraram (matches repetidos caem no conflito).
 */
export async function criarAlertas(db: typeof Db, matches: ResultadoDeMatch[]): Promise<number> {
  if (matches.length === 0) return 0;

  const slugs = [...new Set(matches.map((m) => m.slug))];
  const pubs = await db
    .select({ id: publicacao.id, slug: publicacao.slug })
    .from(publicacao)
    .where(inArray(publicacao.slug, slugs));
  const idPorSlug = new Map(pubs.map((p) => [p.slug, p.id]));

  const values = matches.flatMap((m) => {
    const publicacaoId = idPorSlug.get(m.slug);
    if (!publicacaoId) return []; // publicação some entre ingest e match: não inventar
    return [
      {
        assinanteId: m.assinanteId,
        publicacaoId,
        keywordId: m.keywordId,
        campo: m.campo,
        trecho: m.trecho,
      },
    ];
  });
  if (values.length === 0) return 0;

  const inseridos = await db
    .insert(alerta)
    .values(values)
    .onConflictDoNothing({ target: [alerta.assinanteId, alerta.publicacaoId] })
    .returning({ id: alerta.id });
  return inseridos.length;
}
