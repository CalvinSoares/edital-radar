import { and, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import type { db as Db } from "../cliente";
import { alerta, assinante, publicacao } from "../schema";
import {
  pareceRetificacao,
  vincularRetificacao,
  type AlertaAnteriorParaRetificacao,
} from "../../match/retificacao";

export type PubParaRetificacao = {
  slug: string;
  titulo: string;
  hierarchy: string | null;
};

/**
 * Para cada publicação do dia que parece retificação, cria alerta especial
 * se o assinante já foi avisado do edital original (chave nº/ano).
 */
export async function criarAlertasDeRetificacao(
  db: typeof Db,
  pubs: PubParaRetificacao[],
): Promise<number> {
  const candidatas = pubs.filter((p) => pareceRetificacao(p.titulo));
  if (candidatas.length === 0) return 0;

  const slugs = candidatas.map((p) => p.slug);
  const pubsDb = await db
    .select({
      id: publicacao.id,
      slug: publicacao.slug,
      titulo: publicacao.titulo,
      hierarchy: publicacao.hierarchy,
    })
    .from(publicacao)
    .where(inArray(publicacao.slug, slugs));
  const porSlug = new Map(pubsDb.map((p) => [p.slug, p]));

  const anteriores = await db
    .select({
      alertaId: alerta.id,
      assinanteId: alerta.assinanteId,
      titulo: publicacao.titulo,
      hierarchy: publicacao.hierarchy,
    })
    .from(alerta)
    .innerJoin(publicacao, eq(alerta.publicacaoId, publicacao.id))
    .innerJoin(assinante, eq(alerta.assinanteId, assinante.id))
    .where(
      and(
        eq(alerta.tipo, "oportunidade"),
        isNull(alerta.irrelevanteEm),
        isNull(assinante.suprimidoEm),
        isNull(assinante.descadastradoEm),
        gt(alerta.criadoEm, sql`now() - interval '180 days'`),
      ),
    );

  // Agrupa anteriores por assinante para vincular um a um.
  const porAssinante = new Map<string, AlertaAnteriorParaRetificacao[]>();
  for (const a of anteriores) {
    const lista = porAssinante.get(a.assinanteId) ?? [];
    lista.push(a);
    porAssinante.set(a.assinanteId, lista);
  }

  const values: {
    assinanteId: string;
    publicacaoId: string;
    origem: "keyword";
    tipo: "retificacao";
    alertaOrigemId: string;
    campo: "titulo";
    trecho: string;
  }[] = [];

  for (const cand of candidatas) {
    const pub = porSlug.get(cand.slug);
    if (!pub) continue;

    for (const [assinanteId, lista] of porAssinante) {
      const vinculo = vincularRetificacao(cand.titulo, cand.hierarchy ?? pub.hierarchy, lista);
      if (!vinculo || vinculo.assinanteId !== assinanteId) continue;
      values.push({
        assinanteId,
        publicacaoId: pub.id,
        origem: "keyword",
        tipo: "retificacao",
        alertaOrigemId: vinculo.alertaId,
        campo: "titulo",
        trecho: `Saiu retificação de um edital que avisamos: “${vinculo.titulo.slice(0, 120)}”`,
      });
    }
  }

  if (values.length === 0) return 0;

  const inseridos = await db
    .insert(alerta)
    .values(values)
    .onConflictDoNothing({ target: [alerta.assinanteId, alerta.publicacaoId] })
    .returning({ id: alerta.id });
  return inseridos.length;
}
