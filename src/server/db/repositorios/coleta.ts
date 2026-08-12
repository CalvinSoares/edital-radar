import { desc } from "drizzle-orm";
import type { db as Db } from "../cliente";
import { coletaExecucao } from "../schema";
import type { StatusDaColeta } from "../../coleta/calendario";

export type ExecucaoDeColeta = {
  dataAlvo: string;
  status: StatusDaColeta;
  totalColetado: number;
  totalCasado: number;
  totalEnviado: number;
  erro: string | null;
};

export async function registrarExecucao(db: typeof Db, exec: ExecucaoDeColeta): Promise<void> {
  await db.insert(coletaExecucao).values(exec);
}

/** Alimenta o "Última leitura: hoje, 7h04" da UI. */
export async function ultimaColeta(db: typeof Db) {
  const [ultima] = await db
    .select()
    .from(coletaExecucao)
    .orderBy(desc(coletaExecucao.executadoEm))
    .limit(1);
  return ultima ?? null;
}
