import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { db as Db } from "../cliente";
import { alerta, assinante, keyword, publicacao } from "../schema";
import type { ResultadoDeMatch } from "../../match/casar-keywords";
import type { AlertaPendente } from "../../alerta/selecionar";

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

/** Alertas ainda não comunicados, de assinantes ativos, prontos para o digest. */
export async function listarPendentesParaDigest(db: typeof Db): Promise<AlertaPendente[]> {
  const rows = await db
    .select({
      alertaId: alerta.id,
      assinanteId: alerta.assinanteId,
      email: assinante.email,
      descadastroToken: assinante.descadastroToken,
      termo: keyword.termo,
      titulo: publicacao.titulo,
      trecho: alerta.trecho,
      slug: publicacao.slug,
      dataPublicacao: publicacao.dataPublicacao,
    })
    .from(alerta)
    .innerJoin(assinante, eq(alerta.assinanteId, assinante.id))
    .innerJoin(publicacao, eq(alerta.publicacaoId, publicacao.id))
    .leftJoin(keyword, eq(alerta.keywordId, keyword.id))
    .where(
      and(
        isNull(alerta.enviadoEm),
        isNull(assinante.suprimidoEm),
        isNull(assinante.descadastradoEm),
      ),
    );
  return rows.map((r) => ({ ...r, termo: r.termo ?? "seu termo" }));
}

export async function marcarEnviados(db: typeof Db, alertaIds: string[]): Promise<void> {
  if (alertaIds.length === 0) return;
  await db.update(alerta).set({ enviadoEm: sql`now()` }).where(inArray(alerta.id, alertaIds));
}
