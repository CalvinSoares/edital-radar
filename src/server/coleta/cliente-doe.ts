import { z } from "zod";

// Contrato observado por chamada real em 2026-08-12 — ver
// docs/base-de-conhecimentos/backend/fonte-doe-sp.md. Campo novo só entra
// depois de confirmado em resposta real.
const API = "https://do-api-web-search.doe.sp.gov.br/v2";

const USER_AGENT = "EditalRadar/0.1 (alerta de fomento para OSCs; contato@editalradar.com.br)";

export const ItemDeBuscaSchema = z
  .object({
    id: z.string(),
    slug: z.string().min(1),
    title: z.string(),
    excerpt: z.string().nullish(),
    date: z.string().min(10),
    hierarchy: z.string().nullish(),
    publicationTypeId: z.string().nullish(),
    isLegacy: z.boolean().nullish(),
  })
  .passthrough(); // o bruto completo é gravado; o schema garante só o que usamos

export const PaginaDeBuscaSchema = z
  .object({
    items: z.array(ItemDeBuscaSchema),
    currentPage: z.number(),
    totalPages: z.number(),
    totalItems: z.number(),
    hasNextPage: z.boolean(),
  })
  .passthrough();

export const DetalheDePublicacaoSchema = z
  .object({
    slug: z.string().min(1),
    title: z.string(),
    date: z.string().min(10),
    content: z.string().nullish(),
  })
  .passthrough();

export type ItemDeBusca = z.infer<typeof ItemDeBuscaSchema>;
export type PaginaDeBusca = z.infer<typeof PaginaDeBuscaSchema>;
export type DetalheDePublicacao = z.infer<typeof DetalheDePublicacaoSchema>;

async function comRetentativa<T>(fn: () => Promise<T>, tentativas = 3, baseMs = 500): Promise<T> {
  let ultimoErro: unknown;
  for (let i = 0; i < tentativas; i++) {
    try {
      return await fn();
    } catch (erro) {
      ultimoErro = erro;
      if (i < tentativas - 1) {
        await new Promise((r) => setTimeout(r, baseMs * 2 ** i));
      }
    }
  }
  throw ultimoErro;
}

export async function buscarPaginaDoDia(
  dataAlvo: string, // YYYY-MM-DD
  pagina: number,
  porPagina = 100,
): Promise<PaginaDeBusca> {
  const params = new URLSearchParams({
    PageNumber: String(pagina),
    PageSize: String(porPagina),
    FromDate: dataAlvo,
    ToDate: dataAlvo,
  });
  const url = `${API}/advanced-search/publications?${params}`;

  return comRetentativa(async () => {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    });
    if (!res.ok) throw new Error(`DOE respondeu HTTP ${res.status} em ${url}`);
    const json: unknown = await res.json();
    // Falha alto se o contrato mudou — nunca gravar dado meia-boca.
    return PaginaDeBuscaSchema.parse(json);
  });
}

/** Texto completo (HTML) de uma publicação. */
export async function buscarDetalhe(slug: string): Promise<DetalheDePublicacao> {
  const url = `${API}/publications/${slug}`;
  return comRetentativa(async () => {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    });
    if (!res.ok) throw new Error(`DOE respondeu HTTP ${res.status} em ${url}`);
    const json: unknown = await res.json();
    return DetalheDePublicacaoSchema.parse(json);
  });
}
