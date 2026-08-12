import { and, count, desc, eq, inArray, isNull, sql } from "drizzle-orm";
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
    const origem = m.origem ?? "keyword";
    // keywordId sintético de perfil não existe na tabela keyword.
    const keywordId = origem === "perfil" ? null : m.keywordId;
    return [
      {
        assinanteId: m.assinanteId,
        publicacaoId,
        keywordId,
        origem,
        campo: m.campo,
        trecho: m.trecho,
        resumo: m.resumo ?? null,
        prazoEm: m.prazoEm ?? null,
        prazoTrecho: m.prazoTrecho ?? null,
      },
    ];
  });
  if (values.length === 0) return 0;

  const inseridos = await db
    .insert(alerta)
    .values(values)
    .onConflictDoNothing({ target: [alerta.assinanteId, alerta.publicacaoId] })
    .returning({ id: alerta.id });

  // Fan-out: membros da equipe do dono recebem cópia do alerta.
  const { listarMembrosParaFanOut } = await import("./equipe");
  const membrosPorDono = new Map<string, string[]>();
  const extras: typeof values = [];
  for (const m of matches) {
    const publicacaoId = idPorSlug.get(m.slug);
    if (!publicacaoId) continue;
    let membros = membrosPorDono.get(m.assinanteId);
    if (membros === undefined) {
      membros = await listarMembrosParaFanOut(db, m.assinanteId);
      membrosPorDono.set(m.assinanteId, membros);
    }
    if (membros.length === 0) continue;
    const origem = m.origem ?? "keyword";
    for (const membroId of membros) {
      extras.push({
        assinanteId: membroId,
        publicacaoId,
        keywordId: origem === "perfil" ? null : m.keywordId,
        origem,
        campo: m.campo,
        trecho: m.trecho,
        resumo: m.resumo ?? null,
        prazoEm: m.prazoEm ?? null,
        prazoTrecho: m.prazoTrecho ?? null,
      });
    }
  }
  let fanOut = 0;
  if (extras.length > 0) {
    const mais = await db
      .insert(alerta)
      .values(extras)
      .onConflictDoNothing({ target: [alerta.assinanteId, alerta.publicacaoId] })
      .returning({ id: alerta.id });
    fanOut = mais.length;
  }

  return inseridos.length + fanOut;
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
      origem: alerta.origem,
      tipo: alerta.tipo,
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
        isNull(alerta.irrelevanteEm),
        isNull(assinante.suprimidoEm),
        isNull(assinante.descadastradoEm),
      ),
    );
  return rows.map((r) => ({
    alertaId: r.alertaId,
    assinanteId: r.assinanteId,
    email: r.email,
    descadastroToken: r.descadastroToken,
    titulo: r.titulo,
    trecho: r.trecho,
    slug: r.slug,
    dataPublicacao: r.dataPublicacao,
    tipo: (r.tipo ?? "oportunidade") as "oportunidade" | "retificacao",
    termo:
      r.tipo === "retificacao"
        ? "retificação"
        : (r.termo ?? (r.origem === "perfil" ? "seu perfil Radar" : "seu termo")),
  }));
}

export async function marcarEnviados(db: typeof Db, alertaIds: string[]): Promise<void> {
  if (alertaIds.length === 0) return;
  await db.update(alerta).set({ enviadoEm: sql`now()` }).where(inArray(alerta.id, alertaIds));
}

export type AvisoDoPainel = {
  id: string;
  titulo: string;
  trecho: string;
  termo: string | null;
  slug: string;
  dataPublicacao: Date;
  enviadoEm: Date | null;
  irrelevanteEm: Date | null;
  origem: "keyword" | "perfil";
  tipo: "oportunidade" | "retificacao";
  resumo: string | null;
  prazoEm: Date | null;
  prazoTrecho: string | null;
};

/** Histórico do painel — paginado, mais recentes primeiro. */
export async function listarDoAssinante(
  db: typeof Db,
  assinanteId: string,
  opts: { pagina?: number; porPagina?: number } = {},
): Promise<{ itens: AvisoDoPainel[]; total: number; pagina: number; porPagina: number }> {
  const porPagina = Math.min(Math.max(opts.porPagina ?? 20, 1), 50);
  const pagina = Math.max(opts.pagina ?? 1, 1);
  const offset = (pagina - 1) * porPagina;

  const [totalRow] = await db
    .select({ n: count() })
    .from(alerta)
    .where(eq(alerta.assinanteId, assinanteId));

  const itens = await db
    .select({
      id: alerta.id,
      titulo: publicacao.titulo,
      trecho: alerta.trecho,
      termo: keyword.termo,
      slug: publicacao.slug,
      dataPublicacao: publicacao.dataPublicacao,
      enviadoEm: alerta.enviadoEm,
      irrelevanteEm: alerta.irrelevanteEm,
      origem: alerta.origem,
      tipo: alerta.tipo,
      resumo: alerta.resumo,
      prazoEm: alerta.prazoEm,
      prazoTrecho: alerta.prazoTrecho,
    })
    .from(alerta)
    .innerJoin(publicacao, eq(alerta.publicacaoId, publicacao.id))
    .leftJoin(keyword, eq(alerta.keywordId, keyword.id))
    .where(eq(alerta.assinanteId, assinanteId))
    .orderBy(desc(publicacao.dataPublicacao), desc(alerta.criadoEm))
    .limit(porPagina)
    .offset(offset);

  return {
    itens: itens.map((a) => ({
      ...a,
      origem: (a.origem ?? "keyword") as "keyword" | "perfil",
      tipo: (a.tipo ?? "oportunidade") as "oportunidade" | "retificacao",
    })),
    total: totalRow?.n ?? 0,
    pagina,
    porPagina,
  };
}

/**
 * "Isso não era pra mim" — escopado ao dono, idempotente.
 * Devolve false se o alerta não existe ou não é do assinante.
 */
export async function marcarComoIrrelevante(
  db: typeof Db,
  assinanteId: string,
  alertaId: string,
): Promise<boolean> {
  const atualizados = await db
    .update(alerta)
    .set({ irrelevanteEm: sql`now()` })
    .where(
      and(eq(alerta.id, alertaId), eq(alerta.assinanteId, assinanteId), isNull(alerta.irrelevanteEm)),
    )
    .returning({ id: alerta.id });
  if (atualizados.length > 0) return true;

  const [existe] = await db
    .select({ id: alerta.id })
    .from(alerta)
    .where(and(eq(alerta.id, alertaId), eq(alerta.assinanteId, assinanteId)))
    .limit(1);
  return Boolean(existe);
}
