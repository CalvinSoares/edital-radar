import { and, desc, eq, gt, sql } from "drizzle-orm";
import type { db as Db } from "../cliente";
import { publicacao, publicacaoTema } from "../schema";
import { municipioDoSlugPublicacao } from "../../seo/municipio";

export type MunicipioComContagem = {
  slug: string;
  nome: string;
  total: number;
};

/**
 * Municípios que aparecem em publicações classificadas por tema
 * nos últimos N dias (só slugs `municipios/…`).
 */
export async function listarMunicipiosComTemas(
  db: typeof Db,
  dias = 30,
  limite = 80,
): Promise<MunicipioComContagem[]> {
  const rows = await db
    .select({ slug: publicacao.slug })
    .from(publicacaoTema)
    .innerJoin(publicacao, eq(publicacaoTema.publicacaoId, publicacao.id))
    .where(
      and(
        gt(publicacao.dataPublicacao, sql`now() - make_interval(days => ${dias})`),
        sql`${publicacao.slug} like 'municipios/%'`,
      ),
    );

  const contagem = new Map<string, MunicipioComContagem>();
  for (const r of rows) {
    const m = municipioDoSlugPublicacao(r.slug);
    if (!m) continue;
    const atual = contagem.get(m.slug);
    if (atual) atual.total += 1;
    else contagem.set(m.slug, { slug: m.slug, nome: m.nome, total: 1 });
  }

  return [...contagem.values()].sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome)).slice(0, limite);
}

/** Publicações de um tema filtradas por município (slug DOE). */
export async function listarPorTemaEMunicipio(
  db: typeof Db,
  tema: string,
  municipioSlug: string,
  dias = 15,
  limite = 100,
) {
  const prefixo = `municipios/${municipioSlug}/`;
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
        sql`${publicacao.slug} like ${prefixo + "%"}`,
      ),
    )
    .orderBy(desc(publicacao.dataPublicacao))
    .limit(limite);
}

/** Qualquer publicação temática do município (todos os temas). */
export async function listarTematicasPorMunicipio(
  db: typeof Db,
  municipioSlug: string,
  dias = 15,
  limite = 100,
) {
  const prefixo = `municipios/${municipioSlug}/`;
  return db
    .select({
      titulo: publicacao.titulo,
      excerpt: publicacao.excerpt,
      slug: publicacao.slug,
      hierarchy: publicacao.hierarchy,
      dataPublicacao: publicacao.dataPublicacao,
      tema: publicacaoTema.tema,
    })
    .from(publicacaoTema)
    .innerJoin(publicacao, eq(publicacaoTema.publicacaoId, publicacao.id))
    .where(
      and(
        gt(publicacao.dataPublicacao, sql`now() - make_interval(days => ${dias})`),
        sql`${publicacao.slug} like ${prefixo + "%"}`,
      ),
    )
    .orderBy(desc(publicacao.dataPublicacao))
    .limit(limite);
}
