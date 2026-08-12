import { and, eq, inArray, isNull, sql } from "drizzle-orm";
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
    .select({
      id: assinante.id,
      descadastradoEm: assinante.descadastradoEm,
      suprimidoEm: assinante.suprimidoEm,
    })
    .from(assinante)
    .where(eq(assinante.email, normalizado))
    .limit(1);

  if (existente) {
    if (existente.suprimidoEm) {
      // Não reativa bounce — caller deve tratar como bloqueado.
      return existente.id;
    }
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

/** True se o e-mail está permanentemente bloqueado (bounce/reclamação). */
export async function emailSuprimido(db: typeof Db, email: string): Promise<boolean> {
  const normalizado = email.trim().toLowerCase();
  const [row] = await db
    .select({ id: assinante.id })
    .from(assinante)
    .where(and(eq(assinante.email, normalizado), sql`${assinante.suprimidoEm} is not null`))
    .limit(1);
  return Boolean(row);
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

/**
 * Bounce forte / reclamação → supressão permanente.
 * Idempotente: quem já está suprimido conta de novo (webhook pode reentregar).
 * Devolve quantos e-mails do lote existem no banco (já suprimidos ou acabaram de ser).
 */
export async function suprimirPorEmails(db: typeof Db, emails: string[]): Promise<number> {
  const normalizados = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (normalizados.length === 0) return 0;

  await db
    .update(assinante)
    .set({ suprimidoEm: sql`now()` })
    .where(and(inArray(assinante.email, normalizados), isNull(assinante.suprimidoEm)));

  const existentes = await db
    .select({ id: assinante.id })
    .from(assinante)
    .where(inArray(assinante.email, normalizados));
  return existentes.length;
}
