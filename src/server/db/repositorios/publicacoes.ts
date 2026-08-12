import { eq, sql } from "drizzle-orm";
import type { db as Db } from "../cliente";
import { publicacao } from "../schema";
import type { PublicacaoNormalizada } from "../../coleta/normalizar";
import type { ResumoDoMatch } from "../../coleta/casar-dia";

/**
 * UPSERT por slug (chave natural do DOE) — rodar o job duas vezes no mesmo
 * dia não duplica nada. O bruto é sempre regravado junto.
 */
export async function upsertPublicacoes(db: typeof Db, rows: PublicacaoNormalizada[]): Promise<void> {
  if (rows.length === 0) return;
  await db
    .insert(publicacao)
    .values(rows)
    .onConflictDoUpdate({
      target: publicacao.slug,
      set: {
        titulo: sql`excluded.titulo`,
        excerpt: sql`excluded.excerpt`,
        dataPublicacao: sql`excluded.data_publicacao`,
        hierarchy: sql`excluded.hierarchy`,
        publicationTypeId: sql`excluded.publication_type_id`,
        bruto: sql`excluded.bruto`,
      },
    });
}

/** Persiste o texto completo — só das publicações que casaram com keyword. */
export async function salvarConteudos(db: typeof Db, casadas: ResumoDoMatch["casadas"]): Promise<void> {
  for (const c of casadas) {
    await db
      .update(publicacao)
      .set({ content: c.content, brutoDetalhe: c.brutoDetalhe, contentEm: sql`now()` })
      .where(eq(publicacao.slug, c.slug));
  }
}
