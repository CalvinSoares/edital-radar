import type { APIRoute } from "astro";
import { ingerirDia } from "../../server/coleta/ingerir";
import { hojeEmSaoPaulo } from "../../server/coleta/calendario";

export const prerender = false;

// Chamado pelo cron da Vercel (GET com Authorization: Bearer) ou manualmente
// (POST com x-coleta-secret). Nunca pela UI.
function autorizado(request: Request): boolean {
  const secret = import.meta.env.COLETA_SECRET;
  if (!secret) return false;
  const bearer = request.headers.get("authorization");
  const header = request.headers.get("x-coleta-secret");
  return bearer === `Bearer ${secret}` || header === secret;
}

async function executar(request: Request): Promise<Response> {
  if (!autorizado(request)) {
    return new Response(JSON.stringify({ erro: "não autorizado" }), { status: 401 });
  }

  // Import tardio: o cliente do banco exige DATABASE_URL e não deve derrubar
  // o build/prerender das páginas públicas.
  const { db } = await import("../../server/db/cliente");
  const { upsertPublicacoes } = await import("../../server/db/repositorios/publicacoes");
  const { registrarExecucao } = await import("../../server/db/repositorios/coleta");

  const url = new URL(request.url);
  const dataAlvo = url.searchParams.get("data") ?? hojeEmSaoPaulo(new Date());

  const resumo = await ingerirDia(dataAlvo, {
    salvar: (rows) => upsertPublicacoes(db, rows),
    registrar: (r) =>
      registrarExecucao(db, {
        dataAlvo: r.dataAlvo,
        status: r.status,
        totalColetado: r.totalColetado,
        totalCasado: 0,
        totalEnviado: 0,
        erro: r.erro,
      }),
    log: (m) => console.error(`[coleta] ${m}`),
  });

  const httpStatus = resumo.status === "erro" ? 500 : 200;
  return new Response(JSON.stringify(resumo), {
    status: httpStatus,
    headers: { "Content-Type": "application/json" },
  });
}

export const GET: APIRoute = ({ request }) => executar(request);
export const POST: APIRoute = ({ request }) => executar(request);
