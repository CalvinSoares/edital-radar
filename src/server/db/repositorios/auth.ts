import { and, eq, gt, isNull, sql } from "drizzle-orm";
import type { db as Db } from "../cliente";
import { assinante, loginToken, sessao } from "../schema";

const VALIDADE_DO_LINK = sql`now() + interval '15 minutes'`;
const VALIDADE_DA_SESSAO = sql`now() + interval '30 days'`;

/** Cria um token de login (o id é o token do magic-link). */
export async function criarLoginToken(db: typeof Db, assinanteId: string): Promise<string> {
  const [criado] = await db
    .insert(loginToken)
    .values({ assinanteId, expiraEm: VALIDADE_DO_LINK })
    .returning({ id: loginToken.id });
  return criado!.id;
}

/**
 * Consome um token de login: só funciona uma vez, dentro da validade.
 * A marcação de uso é atômica (UPDATE condicional) — dois cliques no mesmo
 * link não criam duas sessões.
 */
export async function usarLoginToken(db: typeof Db, token: string): Promise<string | null> {
  const [usado] = await db
    .update(loginToken)
    .set({ usadoEm: sql`now()` })
    .where(and(eq(loginToken.id, token), isNull(loginToken.usadoEm), gt(loginToken.expiraEm, sql`now()`)))
    .returning({ assinanteId: loginToken.assinanteId });
  return usado?.assinanteId ?? null;
}

export async function criarSessao(db: typeof Db, assinanteId: string): Promise<string> {
  const [criada] = await db
    .insert(sessao)
    .values({ assinanteId, expiraEm: VALIDADE_DA_SESSAO })
    .returning({ id: sessao.id });
  return criada!.id;
}

export type SessaoAtiva = {
  sessaoId: string;
  assinanteId: string;
  email: string;
  plano: "free" | "radar" | "federacao";
};

export async function obterSessao(db: typeof Db, sessaoId: string): Promise<SessaoAtiva | null> {
  const [ativa] = await db
    .select({
      sessaoId: sessao.id,
      assinanteId: sessao.assinanteId,
      email: assinante.email,
      plano: assinante.plano,
    })
    .from(sessao)
    .innerJoin(assinante, eq(sessao.assinanteId, assinante.id))
    .where(
      and(
        eq(sessao.id, sessaoId),
        isNull(sessao.revogadaEm),
        gt(sessao.expiraEm, sql`now()`),
        isNull(assinante.suprimidoEm),
        isNull(assinante.descadastradoEm),
      ),
    )
    .limit(1);
  return ativa ?? null;
}

/** Dados mínimos para o admin “ver como” (inclui inativos — só leitura). */
export async function obterAssinanteParaVista(
  db: typeof Db,
  assinanteId: string,
): Promise<SessaoAtiva | null> {
  const [row] = await db
    .select({
      assinanteId: assinante.id,
      email: assinante.email,
      plano: assinante.plano,
    })
    .from(assinante)
    .where(eq(assinante.id, assinanteId))
    .limit(1);
  if (!row) return null;
  return {
    sessaoId: "vista-admin",
    assinanteId: row.assinanteId,
    email: row.email,
    plano: row.plano,
  };
}

export async function revogarSessao(db: typeof Db, sessaoId: string): Promise<void> {
  await db.update(sessao).set({ revogadaEm: sql`now()` }).where(eq(sessao.id, sessaoId));
}
