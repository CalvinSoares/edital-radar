import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import type { db as Db } from "../cliente";
import { publicacao, publicacaoTema } from "../schema";

/** Persiste a classificação do dia — idempotente (UNIQUE publicacao+tema). */
export async function salvarTemas(
  db: typeof Db,
  pares: { pubSlug: string; tema: string }[],
): Promise<number> {
  if (pares.length === 0) return 0;

  const slugs = [...new Set(pares.map((p) => p.pubSlug))];
  const pubs = await db
    .select({ id: publicacao.id, slug: publicacao.slug })
    .from(publicacao)
    .where(inArray(publicacao.slug, slugs));
  const idPorSlug = new Map(pubs.map((p) => [p.slug, p.id]));

  const values = pares.flatMap((p) => {
    const publicacaoId = idPorSlug.get(p.pubSlug);
    return publicacaoId ? [{ publicacaoId, tema: p.tema }] : [];
  });
  if (values.length === 0) return 0;

  const inseridos = await db
    .insert(publicacaoTema)
    .values(values)
    .onConflictDoNothing({ target: [publicacaoTema.publicacaoId, publicacaoTema.tema] })
    .returning({ id: publicacaoTema.id });
  return inseridos.length;
}

/** Publicações de um tema nos últimos N dias — mais recentes primeiro. */
export async function listarPorTema(db: typeof Db, tema: string, dias = 15, limite = 200) {
  return db
    .select({
      titulo: publicacao.titulo,
      excerpt: publicacao.excerpt,
      slug: publicacao.slug,
      hierarchy: publicacao.hierarchy,
      dataPublicacao: publicacao.dataPublicacao,
    })
    .from(publicacaoTema)
    .innerJoin(publicacao, eq(publicacaoTema.publicacaoId, publicacao.id))
    .where(
      and(
        eq(publicacaoTema.tema, tema),
        gt(publicacao.dataPublicacao, sql`now() - make_interval(days => ${dias})`),
      ),
    )
    .orderBy(desc(publicacao.dataPublicacao))
    .limit(limite);
}

/** Contagem por tema nos últimos N dias — para a página índice. */
export async function contarPorTema(db: typeof Db, dias = 30) {
  const rows = await db
    .select({ tema: publicacaoTema.tema, total: sql<number>`count(*)::int` })
    .from(publicacaoTema)
    .innerJoin(publicacao, eq(publicacaoTema.publicacaoId, publicacao.id))
    .where(gt(publicacao.dataPublicacao, sql`now() - make_interval(days => ${dias})`))
    .groupBy(publicacaoTema.tema);
  return new Map(rows.map((r) => [r.tema, r.total]));
}
