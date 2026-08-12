import { and, count, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import type { db as Db } from "../cliente";
import { alerta, assinante, coletaExecucao, keyword, publicacao, sessao } from "../schema";

export type StatusDoAssinante = "ativo" | "descadastrado" | "suprimido";

export type AssinanteAdmin = {
  id: string;
  email: string;
  plano: "free" | "radar" | "federacao";
  status: StatusDoAssinante;
  termos: string[];
  criadoEm: Date;
  totalAlertas: number;
};

export type ResumoAdmin = {
  assinantesAtivos: number;
  assinantesSuprimidos: number;
  assinantesDescadastrados: number;
  termosVigiados: number;
  alertasPendentes: number;
  feedbacksIrrelevantes: number;
};

function statusDe(row: {
  descadastradoEm: Date | null;
  suprimidoEm: Date | null;
}): StatusDoAssinante {
  if (row.suprimidoEm) return "suprimido";
  if (row.descadastradoEm) return "descadastrado";
  return "ativo";
}

export async function resumoAdmin(db: typeof Db): Promise<ResumoAdmin> {
  const [ativos] = await db
    .select({ n: count() })
    .from(assinante)
    .where(and(isNull(assinante.suprimidoEm), isNull(assinante.descadastradoEm)));
  const [suprimidos] = await db
    .select({ n: count() })
    .from(assinante)
    .where(isNotNull(assinante.suprimidoEm));
  const [descadastrados] = await db
    .select({ n: count() })
    .from(assinante)
    .where(and(isNull(assinante.suprimidoEm), isNotNull(assinante.descadastradoEm)));
  const [termos] = await db.select({ n: count() }).from(keyword);
  const [pendentes] = await db
    .select({ n: count() })
    .from(alerta)
    .where(and(isNull(alerta.enviadoEm), isNull(alerta.irrelevanteEm)));
  const [feedbacks] = await db
    .select({ n: count() })
    .from(alerta)
    .where(isNotNull(alerta.irrelevanteEm));

  return {
    assinantesAtivos: ativos?.n ?? 0,
    assinantesSuprimidos: suprimidos?.n ?? 0,
    assinantesDescadastrados: descadastrados?.n ?? 0,
    termosVigiados: termos?.n ?? 0,
    alertasPendentes: pendentes?.n ?? 0,
    feedbacksIrrelevantes: feedbacks?.n ?? 0,
  };
}

/** Lista assinantes mais recentes, com termos e contagem de alertas. */
export async function listarAssinantesAdmin(
  db: typeof Db,
  opts: { busca?: string; limite?: number } = {},
): Promise<AssinanteAdmin[]> {
  const limite = Math.min(opts.limite ?? 100, 200);
  const busca = opts.busca?.trim().toLowerCase();

  const rows = await db
    .select({
      id: assinante.id,
      email: assinante.email,
      plano: assinante.plano,
      criadoEm: assinante.criadoEm,
      descadastradoEm: assinante.descadastradoEm,
      suprimidoEm: assinante.suprimidoEm,
    })
    .from(assinante)
    .where(busca ? sql`lower(${assinante.email}) like ${`%${busca}%`}` : undefined)
    .orderBy(desc(assinante.criadoEm))
    .limit(limite);

  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const termosRows = await db
    .select({ assinanteId: keyword.assinanteId, termo: keyword.termo })
    .from(keyword)
    .where(inArray(keyword.assinanteId, ids));
  const alertasRows = await db
    .select({
      assinanteId: alerta.assinanteId,
      total: sql<number>`count(*)::int`,
    })
    .from(alerta)
    .where(inArray(alerta.assinanteId, ids))
    .groupBy(alerta.assinanteId);

  const termosPorId = new Map<string, string[]>();
  for (const t of termosRows) {
    const lista = termosPorId.get(t.assinanteId) ?? [];
    lista.push(t.termo);
    termosPorId.set(t.assinanteId, lista);
  }
  const alertasPorId = new Map(alertasRows.map((a) => [a.assinanteId, a.total]));

  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    plano: r.plano,
    status: statusDe(r),
    termos: termosPorId.get(r.id) ?? [],
    criadoEm: r.criadoEm,
    totalAlertas: alertasPorId.get(r.id) ?? 0,
  }));
}

export async function listarColetasAdmin(db: typeof Db, limite = 30) {
  return db
    .select({
      id: coletaExecucao.id,
      dataAlvo: coletaExecucao.dataAlvo,
      status: coletaExecucao.status,
      totalColetado: coletaExecucao.totalColetado,
      totalCasado: coletaExecucao.totalCasado,
      totalEnviado: coletaExecucao.totalEnviado,
      erro: coletaExecucao.erro,
      executadoEm: coletaExecucao.executadoEm,
    })
    .from(coletaExecucao)
    .orderBy(desc(coletaExecucao.executadoEm))
    .limit(Math.min(limite, 100));
}

/** Supressão manual (idempotente). */
export async function suprimirAssinanteAdmin(db: typeof Db, id: string): Promise<boolean> {
  const atualizados = await db
    .update(assinante)
    .set({ suprimidoEm: sql`now()` })
    .where(and(eq(assinante.id, id), isNull(assinante.suprimidoEm)))
    .returning({ id: assinante.id });
  return atualizados.length > 0 || Boolean(
    (
      await db.select({ id: assinante.id }).from(assinante).where(eq(assinante.id, id)).limit(1)
    )[0],
  );
}

/** Fila de "não era pra mim" — para revisar regras de match. */
export async function listarFeedbacksAdmin(
  db: typeof Db,
  opts: { limite?: number; soPendentes?: boolean } = {},
) {
  const limite = Math.min(opts.limite ?? 50, 100);
  const condicoes = [isNotNull(alerta.irrelevanteEm)];
  if (opts.soPendentes !== false) {
    condicoes.push(isNull(alerta.feedbackRevisao));
  }

  return db
    .select({
      alertaId: alerta.id,
      email: assinante.email,
      termo: keyword.termo,
      titulo: publicacao.titulo,
      slug: publicacao.slug,
      trecho: alerta.trecho,
      irrelevanteEm: alerta.irrelevanteEm,
      feedbackRevisao: alerta.feedbackRevisao,
      feedbackRevisaoEm: alerta.feedbackRevisaoEm,
    })
    .from(alerta)
    .innerJoin(assinante, eq(alerta.assinanteId, assinante.id))
    .innerJoin(publicacao, eq(alerta.publicacaoId, publicacao.id))
    .leftJoin(keyword, eq(alerta.keywordId, keyword.id))
    .where(and(...condicoes))
    .orderBy(desc(alerta.irrelevanteEm))
    .limit(limite);
}

export type RevisaoDeFeedback =
  | "falso_positivo_filtro"
  | "termo_ruim"
  | "catalogo"
  | "descartado";

export async function revisarFeedbackAdmin(
  db: typeof Db,
  alertaId: string,
  revisao: RevisaoDeFeedback,
): Promise<boolean> {
  const atualizados = await db
    .update(alerta)
    .set({ feedbackRevisao: revisao, feedbackRevisaoEm: sql`now()` })
    .where(and(eq(alerta.id, alertaId), isNotNull(alerta.irrelevanteEm)))
    .returning({ id: alerta.id });
  return atualizados.length > 0;
}

/** Métricas leves do piloto (retenção / precisão). */
export async function metricasPiloto(db: typeof Db) {
  const [ativos] = await db
    .select({ n: count() })
    .from(assinante)
    .where(and(isNull(assinante.suprimidoEm), isNull(assinante.descadastradoEm)));

  const [sessoes7d] = await db
    .select({ n: sql<number>`count(distinct ${sessao.assinanteId})::int` })
    .from(sessao)
    .where(
      and(
        isNull(sessao.revogadaEm),
        sql`${sessao.criadaEm} > now() - interval '7 days'`,
      ),
    );

  const [feedbacksPendentes] = await db
    .select({ n: count() })
    .from(alerta)
    .where(and(isNotNull(alerta.irrelevanteEm), isNull(alerta.feedbackRevisao)));

  const [alertas7d] = await db
    .select({ n: count() })
    .from(alerta)
    .where(sql`${alerta.enviadoEm} > now() - interval '7 days'`);

  const [radar] = await db
    .select({ n: count() })
    .from(assinante)
    .where(
      and(
        sql`${assinante.plano} in ('radar', 'federacao')`,
        isNull(assinante.suprimidoEm),
        isNull(assinante.descadastradoEm),
      ),
    );

  return {
    assinantesAtivos: ativos?.n ?? 0,
    voltaramEm7d: sessoes7d?.n ?? 0,
    feedbacksPendentes: feedbacksPendentes?.n ?? 0,
    alertasEnviados7d: alertas7d?.n ?? 0,
    planosRadar: radar?.n ?? 0,
  };
}
