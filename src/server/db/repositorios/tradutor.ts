import { and, eq, sql } from "drizzle-orm";
import type { db as Db } from "../cliente";
import { alerta, checklistTradutor, publicacao } from "../schema";
import type { RespostaChecklist } from "../../tradutor/checklist";

export async function obterAlertaParaTradutor(
  db: typeof Db,
  assinanteId: string,
  alertaId: string,
) {
  const [row] = await db
    .select({
      id: alerta.id,
      titulo: publicacao.titulo,
      slug: publicacao.slug,
      trecho: alerta.trecho,
      resumo: alerta.resumo,
      prazoEm: alerta.prazoEm,
      tipo: alerta.tipo,
      irrelevanteEm: alerta.irrelevanteEm,
    })
    .from(alerta)
    .innerJoin(publicacao, eq(alerta.publicacaoId, publicacao.id))
    .where(and(eq(alerta.id, alertaId), eq(alerta.assinanteId, assinanteId)))
    .limit(1);
  return row ?? null;
}

export async function obterChecklist(
  db: typeof Db,
  assinanteId: string,
  alertaId: string,
): Promise<Record<string, RespostaChecklist>> {
  const [row] = await db
    .select({ respostas: checklistTradutor.respostas })
    .from(checklistTradutor)
    .where(
      and(
        eq(checklistTradutor.alertaId, alertaId),
        eq(checklistTradutor.assinanteId, assinanteId),
      ),
    )
    .limit(1);
  return row?.respostas ?? {};
}

export async function salvarChecklist(
  db: typeof Db,
  assinanteId: string,
  alertaId: string,
  respostas: Record<string, RespostaChecklist>,
): Promise<boolean> {
  const existe = await obterAlertaParaTradutor(db, assinanteId, alertaId);
  if (!existe) return false;

  await db
    .insert(checklistTradutor)
    .values({
      alertaId,
      assinanteId,
      respostas,
      atualizadoEm: sql`now()`,
    })
    .onConflictDoUpdate({
      target: checklistTradutor.alertaId,
      set: { respostas, atualizadoEm: sql`now()` },
    });
  return true;
}
