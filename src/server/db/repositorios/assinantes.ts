import { and, eq, isNull, sql } from "drizzle-orm";
import type { db as Db } from "../cliente";
import { assinante } from "../schema";

/**
 * Descadastro em 1 clique pelo token do e-mail. Idempotente: token já
 * descadastrado devolve true de novo (a pessoa vê a mesma confirmação).
 */
export async function descadastrarPorToken(db: typeof Db, token: string): Promise<boolean> {
  const [existente] = await db
    .select({ id: assinante.id, descadastradoEm: assinante.descadastradoEm })
    .from(assinante)
    .where(eq(assinante.descadastroToken, token))
    .limit(1);
  if (!existente) return false;
  if (existente.descadastradoEm) return true;

  await db
    .update(assinante)
    .set({ descadastradoEm: sql`now()` })
    .where(and(eq(assinante.id, existente.id), isNull(assinante.descadastradoEm)));
  return true;
}
