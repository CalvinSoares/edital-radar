import { and, eq, isNull, notExists, sql } from "drizzle-orm";
import type { db as Db } from "../cliente";
import { alerta, assinante, digestVazioEnvio } from "../schema";
import type { AssinanteParaDigestVazio } from "../../alerta/digest-vazio";
import { semanaIsoDe } from "../../alerta/digest-vazio";

/**
 * Assinantes ativos que:
 * - ainda não receberam digest vazio nesta semana ISO
 * - não tiveram digest (alerta enviado) nos últimos 7 dias
 */
export async function listarCandidatosDigestVazio(
  db: typeof Db,
  dataAlvo: string,
): Promise<AssinanteParaDigestVazio[]> {
  const semana = semanaIsoDe(dataAlvo);

  const rows = await db
    .select({
      assinanteId: assinante.id,
      email: assinante.email,
      descadastroToken: assinante.descadastroToken,
    })
    .from(assinante)
    .where(
      and(
        isNull(assinante.suprimidoEm),
        isNull(assinante.descadastradoEm),
        notExists(
          db
            .select({ id: digestVazioEnvio.id })
            .from(digestVazioEnvio)
            .where(
              and(
                eq(digestVazioEnvio.assinanteId, assinante.id),
                eq(digestVazioEnvio.semanaIso, semana),
              ),
            ),
        ),
        notExists(
          db
            .select({ id: alerta.id })
            .from(alerta)
            .where(
              and(
                eq(alerta.assinanteId, assinante.id),
                sql`${alerta.enviadoEm} > now() - interval '7 days'`,
              ),
            ),
        ),
      ),
    );

  return rows;
}

export async function registrarDigestVazio(
  db: typeof Db,
  assinanteId: string,
  semanaIso: string,
): Promise<void> {
  await db
    .insert(digestVazioEnvio)
    .values({ assinanteId, semanaIso })
    .onConflictDoNothing({ target: [digestVazioEnvio.assinanteId, digestVazioEnvio.semanaIso] });
}
