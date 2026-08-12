import { describe, expect, it } from "vitest";
import { rodarDia, type DepsDaRodada } from "./rodar";
import type { PaginaDeBusca } from "./cliente-doe";

function paginaComItens(slugs: string[]): PaginaDeBusca {
  return {
    items: slugs.map((slug, i) => ({
      id: `id-${i}`,
      slug,
      title: `PUBLICAÇÃO ${slug}`,
      excerpt: "texto qualquer",
      date: "2026-08-11T01:00:00.000",
      hierarchy: "Executivo",
      publicationTypeId: "t",
      isLegacy: false,
    })),
    currentPage: 1,
    totalPages: 1,
    totalItems: slugs.length,
    hasNextPage: false,
  };
}

function depsBase(sobrescrever: Partial<DepsDaRodada> = {}): DepsDaRodada & {
  registros: unknown[];
} {
  const registros: unknown[] = [];
  return {
    registros,
    salvarPublicacoes: async () => {},
    listarKeywords: async () => [{ id: "kw", assinanteId: "as", termo: "publicação" }],
    salvarConteudos: async () => {},
    criarAlertas: async (matches) => matches.length,
    registrar: async (r) => void registros.push(r),
    buscarPagina: async () => paginaComItens(["a", "b"]),
    buscarDetalhe: async (slug) => ({
      slug,
      title: `PUBLICAÇÃO ${slug}`,
      date: "2026-08-11T01:00:00",
      content: null,
    }),
    ...sobrescrever,
  };
}

describe("rodarDia", () => {
  it("fluxo completo: ingere, casa (título) e cria alertas", async () => {
    const deps = depsBase();
    const resumo = await rodarDia("2026-08-11", deps);
    expect(resumo.status).toBe("ok");
    expect(resumo.totalColetado).toBe(2);
    expect(resumo.totalCasado).toBe(2); // "publicação" casa no título das duas
    expect(resumo.alertasCriados).toBe(2);
    expect(deps.registros).toHaveLength(1); // registra UMA vez, com totais
  });

  it("sem keywords: match pulado, mas execução registrada", async () => {
    const deps = depsBase({ listarKeywords: async () => [] });
    const resumo = await rodarDia("2026-08-11", deps);
    expect(resumo.status).toBe("ok");
    expect(resumo.totalCasado).toBe(0);
    expect(deps.registros).toHaveLength(1);
  });

  it("erro na fase de match vira status erro — e registra mesmo assim", async () => {
    const deps = depsBase({
      criarAlertas: async () => {
        throw new Error("banco caiu");
      },
    });
    const resumo = await rodarDia("2026-08-11", deps);
    expect(resumo.status).toBe("erro");
    expect(resumo.erro).toBe("banco caiu");
    expect(deps.registros).toHaveLength(1);
  });

  it("falhas de detalhe acima de 10% viram erro", async () => {
    const deps = depsBase({
      buscarDetalhe: async () => {
        throw new Error("HTTP 500");
      },
    });
    const resumo = await rodarDia("2026-08-11", deps);
    expect(resumo.falhasDeDetalhe).toBe(2);
    expect(resumo.status).toBe("erro");
  });

  it("fim de semana sem edição não roda match e registra sem_edicao", async () => {
    const deps = depsBase({ buscarPagina: async () => paginaComItens([]) });
    const resumo = await rodarDia("2026-08-09", deps);
    expect(resumo.status).toBe("sem_edicao");
    expect(resumo.totalCasado).toBe(0);
  });
});
