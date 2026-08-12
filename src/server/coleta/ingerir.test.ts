import { describe, expect, it } from "vitest";
import type { ItemDeBusca, PaginaDeBusca } from "./cliente-doe";
import { ingerirDia } from "./ingerir";
import type { PublicacaoNormalizada } from "./normalizar";

function itemFake(n: number): ItemDeBusca {
  return {
    id: `id-${n}`,
    slug: `executivo/orgao/pub-${n}`,
    title: `PUBLICAÇÃO ${n}`,
    excerpt: "trecho",
    date: "2026-08-11T01:00:00.000",
    hierarchy: "Executivo > Seção",
    publicationTypeId: "tipo-1",
    isLegacy: false,
  };
}

function paginaFake(atual: number, totalPaginas: number, itens: number): PaginaDeBusca {
  return {
    items: Array.from({ length: itens }, (_, i) => itemFake(atual * 1000 + i)),
    currentPage: atual,
    totalPages: totalPaginas,
    totalItems: totalPaginas * itens,
    hasNextPage: atual < totalPaginas,
  };
}

describe("ingerirDia", () => {
  it("pagina até o fim, salva cada lote e registra ok", async () => {
    const salvos: PublicacaoNormalizada[][] = [];
    const registros: unknown[] = [];

    const resumo = await ingerirDia("2026-08-11", {
      buscarPagina: async (_data, pagina) => paginaFake(pagina, 3, 2),
      salvar: async (rows) => void salvos.push(rows),
      registrar: async (r) => void registros.push(r),
    });

    expect(resumo.status).toBe("ok");
    expect(resumo.totalColetado).toBe(6);
    expect(resumo.paginas).toBe(3);
    expect(salvos).toHaveLength(3);
    expect(registros).toHaveLength(1);
  });

  it("dia útil sem publicações vira erro (alarme)", async () => {
    const resumo = await ingerirDia("2026-08-11", {
      buscarPagina: async () => paginaFake(1, 1, 0),
      salvar: async () => {},
      registrar: async () => {},
    });
    expect(resumo.status).toBe("erro");
  });

  it("fim de semana sem publicações é sem_edicao (normal)", async () => {
    const resumo = await ingerirDia("2026-08-09", {
      buscarPagina: async () => paginaFake(1, 1, 0),
      salvar: async () => {},
      registrar: async () => {},
    });
    expect(resumo.status).toBe("sem_edicao");
  });

  it("falha da API registra a execução mesmo assim — nunca silêncio", async () => {
    const registros: { status: string; erro: string | null }[] = [];
    const resumo = await ingerirDia("2026-08-11", {
      buscarPagina: async () => {
        throw new Error("DOE respondeu HTTP 500");
      },
      salvar: async () => {},
      registrar: async (r) => void registros.push({ status: r.status, erro: r.erro }),
    });
    expect(resumo.status).toBe("erro");
    expect(registros).toEqual([{ status: "erro", erro: "DOE respondeu HTTP 500" }]);
  });
});
