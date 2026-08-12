import { and, eq, isNull, sql } from "drizzle-orm";
import type { db as Db } from "../cliente";
import { assinante, perfilRadar } from "../schema";
import type { PerfilParaMatch } from "../../match/casar-perfil";
import {
  CATALOGO_DE_CAUSAS,
  CATALOGO_DE_REGIOES,
  LIMITE_CAUSAS_POR_PERFIL,
  LIMITE_REGIOES_POR_PERFIL,
} from "../../match/perfil-catalogo";

export type PerfilSalvo = {
  causas: string[];
  regioes: string[];
  atualizadoEm: Date;
};

export async function obterPerfil(db: typeof Db, assinanteId: string): Promise<PerfilSalvo | null> {
  const [row] = await db
    .select({
      causas: perfilRadar.causas,
      regioes: perfilRadar.regioes,
      atualizadoEm: perfilRadar.atualizadoEm,
    })
    .from(perfilRadar)
    .where(eq(perfilRadar.assinanteId, assinanteId))
    .limit(1);
  if (!row) return null;
  return {
    causas: row.causas ?? [],
    regioes: row.regioes ?? [],
    atualizadoEm: row.atualizadoEm,
  };
}

export async function salvarPerfil(
  db: typeof Db,
  assinanteId: string,
  input: { causas: string[]; regioes: string[] },
): Promise<PerfilSalvo> {
  const causasValidas = new Set(CATALOGO_DE_CAUSAS.map((c) => c.slug));
  const regioesValidas = new Set(CATALOGO_DE_REGIOES.map((r) => r.slug));
  const causas = [...new Set(input.causas.filter((c) => causasValidas.has(c)))].slice(
    0,
    LIMITE_CAUSAS_POR_PERFIL,
  );
  const regioes = [...new Set(input.regioes.filter((r) => regioesValidas.has(r)))].slice(
    0,
    LIMITE_REGIOES_POR_PERFIL,
  );

  const [salvo] = await db
    .insert(perfilRadar)
    .values({
      assinanteId,
      causas,
      regioes,
      atualizadoEm: sql`now()`,
    })
    .onConflictDoUpdate({
      target: perfilRadar.assinanteId,
      set: { causas, regioes, atualizadoEm: sql`now()` },
    })
    .returning({
      causas: perfilRadar.causas,
      regioes: perfilRadar.regioes,
      atualizadoEm: perfilRadar.atualizadoEm,
    });

  return {
    causas: salvo!.causas ?? [],
    regioes: salvo!.regioes ?? [],
    atualizadoEm: salvo!.atualizadoEm,
  };
}

/** Perfis de assinantes Radar ativos — para o job diário. */
export async function listarPerfisParaMatch(db: typeof Db): Promise<PerfilParaMatch[]> {
  const rows = await db
    .select({
      assinanteId: perfilRadar.assinanteId,
      causas: perfilRadar.causas,
      regioes: perfilRadar.regioes,
    })
    .from(perfilRadar)
    .innerJoin(assinante, eq(perfilRadar.assinanteId, assinante.id))
    .where(
      and(
        isNull(assinante.suprimidoEm),
        isNull(assinante.descadastradoEm),
        sql`jsonb_array_length(${perfilRadar.causas}) > 0`,
        sql`jsonb_array_length(${perfilRadar.regioes}) > 0`,
      ),
    );

  return rows.map((r) => ({
    assinanteId: r.assinanteId,
    causas: r.causas ?? [],
    regioes: r.regioes ?? [],
  }));
}

export async function definirPlano(
  db: typeof Db,
  assinanteId: string,
  plano: "free" | "radar" | "federacao",
): Promise<void> {
  await db.update(assinante).set({ plano }).where(eq(assinante.id, assinanteId));
}
