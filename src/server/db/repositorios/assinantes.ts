import { and, eq, isNull, sql } from "drizzle-orm";
import type { db as Db } from "../cliente";
import { assinante } from "../schema";

/**
 * Cadastro e login são o mesmo gesto: garante que o assinante existe.
 * Quem se descadastrou e voltou a pedir é reativado (pediu de novo).
 * Supressão por bounce NÃO é limpa — é permanente por invariante.
 */
export async function obterOuCriarPorEmail(db: typeof Db, email: string): Promise<string> {
  const normalizado = email.trim().toLowerCase();
  const [existente] = await db
    .select({ id: assinante.id, descadastradoEm: assinante.descadastradoEm })
    .from(assinante)
    .where(eq(assinante.email, normalizado))
    .limit(1);

  if (existente) {
    if (existente.descadastradoEm) {
      await db.update(assinante).set({ descadastradoEm: null }).where(eq(assinante.id, existente.id));
    }
    return existente.id;
  }

  const [criado] = await db
    .insert(assinante)
    .values({ email: normalizado })
    .onConflictDoNothing({ target: assinante.email })
    .returning({ id: assinante.id });
  if (criado) return criado.id;
  // corrida: outro request criou entre o select e o insert
  const [aposCorrida] = await db
    .select({ id: assinante.id })
    .from(assinante)
    .where(eq(assinante.email, normalizado))
    .limit(1);
  return aposCorrida!.id;
}

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
