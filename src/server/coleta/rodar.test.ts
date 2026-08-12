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
    listarPerfis: async () => [],
    salvarConteudos: async () => {},
    criarAlertas: async (matches) => matches.length,
    salvarTemas: async (pares) => pares.length,
    enviarDigests: async () => ({ emails: 1, alertasEnviados: 2, falhas: 0 }),
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
  it("fluxo completo: ingere, casa (título), cria alertas e envia digests", async () => {
    const deps = depsBase();
    const resumo = await rodarDia("2026-08-11", deps);
    expect(resumo.status).toBe("ok");
    expect(resumo.totalColetado).toBe(2);
    expect(resumo.totalCasado).toBe(2); // "publicação" casa no título das duas
    expect(resumo.alertasCriados).toBe(2);
    expect(resumo.emailsEnviados).toBe(1);
    expect(resumo.alertasEnviados).toBe(2);
    expect(deps.registros).toHaveLength(1); // registra UMA vez, com totais
  });

  it("dia sem edição AINDA envia digests pendentes de dias anteriores", async () => {
    let envioChamado = false;
    const deps = depsBase({
      buscarPagina: async () => paginaComItens([]),
      enviarDigests: async () => {
        envioChamado = true;
        return { emails: 1, alertasEnviados: 3, falhas: 0 };
      },
    });
    const resumo = await rodarDia("2026-08-09", deps);
    expect(resumo.status).toBe("sem_edicao");
    expect(envioChamado).toBe(true);
    expect(resumo.alertasEnviados).toBe(3);
  });

  it("falha total no envio vira status erro — e registra mesmo assim", async () => {
    const deps = depsBase({
      enviarDigests: async () => {
        throw new Error("provedor fora do ar");
      },
    });
    const resumo = await rodarDia("2026-08-11", deps);
    expect(resumo.status).toBe("erro");
    expect(resumo.erro).toBe("provedor fora do ar");
    expect(deps.registros).toHaveLength(1);
  });

  it("sem keywords: nenhum alerta, mas os TEMAS ainda são classificados", async () => {
    let temasRecebidos = 0;
    const deps = depsBase({
      listarKeywords: async () => [],
      salvarTemas: async (pares) => {
        temasRecebidos = pares.length;
        return pares.length;
      },
      // título com "credenciamento" casa o tema do catálogo real
      buscarDetalhe: async (slug) => ({
        slug,
        title: "ABERTURA DE CREDENCIAMENTO",
        date: "2026-08-11T01:00:00",
        content: "abertura de credenciamento de organizações",
      }),
    });
    const resumo = await rodarDia("2026-08-11", deps);
    expect(resumo.status).toBe("ok");
    expect(resumo.totalCasado).toBe(0);
    expect(temasRecebidos).toBeGreaterThan(0); // páginas SEO não dependem de assinante
    expect(resumo.temasClassificados).toBe(temasRecebidos);
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

  it("status erro dispara notificarAlarme", async () => {
    const alarmes: string[] = [];
    const deps = depsBase({
      buscarPagina: async () => paginaComItens([]),
      notificarAlarme: async (msg) => void alarmes.push(msg.assunto),
    });
    // 2026-08-12 é quarta — 0 pubs = erro
    const resumo = await rodarDia("2026-08-12", deps);
    expect(resumo.status).toBe("erro");
    expect(alarmes).toHaveLength(1);
    expect(alarmes[0]).toContain("2026-08-12");
  });

  it("sem_edicao NÃO dispara alarme", async () => {
    let chamado = false;
    const deps = depsBase({
      buscarPagina: async () => paginaComItens([]),
      notificarAlarme: async () => {
        chamado = true;
      },
    });
    await rodarDia("2026-08-09", deps);
    expect(chamado).toBe(false);
  });
});
