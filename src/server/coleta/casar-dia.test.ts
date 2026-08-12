import { describe, expect, it } from "vitest";
import { casarDia, type PublicacaoDoDia } from "./casar-dia";
import { mapComLimite } from "./concorrencia";
import type { DetalheDePublicacao } from "./cliente-doe";

function detalheFake(slug: string, content: string | null): DetalheDePublicacao {
  return { slug, title: "T", date: "2026-08-11T01:00:00", content };
}

const kw = (id: string, termo: string) => ({ id, assinanteId: `as-${id}`, termo });

describe("mapComLimite", () => {
  it("preserva a ordem e captura erros por posição", async () => {
    const r = await mapComLimite([1, 2, 3], 2, async (n) => {
      if (n === 2) throw new Error("falhou o 2");
      return n * 10;
    });
    expect(r).toEqual([{ ok: 10 }, { erro: "falhou o 2" }, { ok: 30 }]);
  });

  it("nunca excede o limite de concorrência", async () => {
    let ativos = 0;
    let pico = 0;
    await mapComLimite(Array.from({ length: 20 }, (_, i) => i), 3, async () => {
      ativos += 1;
      pico = Math.max(pico, ativos);
      await new Promise((r) => setTimeout(r, 5));
      ativos -= 1;
    });
    expect(pico).toBeLessThanOrEqual(3);
  });
});

describe("casarDia", () => {
  const publicacoes: PublicacacaoLista = [
    { slug: "a", titulo: "AVISO QUALQUER", excerpt: "sem nada relevante" },
    { slug: "b", titulo: "DESPACHO", excerpt: "trâmite comum" },
    { slug: "c", titulo: "EXTRATO", excerpt: null },
  ];
  type PublicacacaoLista = PublicacaoDoDia[];

  it("casa termo que só aparece no content (o motivo do full-text)", async () => {
    const resumo = await casarDia({
      publicacoes,
      keywords: [kw("1", "chamamento publico")],
      buscarDetalhe: async (slug) =>
        detalheFake(slug, slug === "b" ? "… fica aberto o Chamamento Público nº 9 …" : "nada aqui"),
    });
    expect(resumo.matches).toHaveLength(1);
    expect(resumo.matches[0]!.slug).toBe("b");
    expect(resumo.matches[0]!.campo).toBe("content");
    expect(resumo.casadas.map((c) => c.slug)).toEqual(["b"]);
  });

  it("falha de detalhe é contada e não derruba o dia", async () => {
    const resumo = await casarDia({
      publicacoes,
      keywords: [kw("1", "despacho")],
      buscarDetalhe: async (slug) => {
        if (slug === "c") throw new Error("HTTP 500");
        return detalheFake(slug, null);
      },
    });
    expect(resumo.totalComFalhaDeDetalhe).toBe(1);
    expect(resumo.matches.map((m) => m.slug)).toEqual(["b"]); // casou no título
  });

  it("sem keywords nem temas não busca nada", async () => {
    let chamadas = 0;
    const resumo = await casarDia({
      publicacoes,
      keywords: [],
      buscarDetalhe: async (slug) => {
        chamadas += 1;
        return detalheFake(slug, null);
      },
    });
    expect(chamadas).toBe(0);
    expect(resumo.totalVarrido).toBe(0);
  });

  it("classifica temas na mesma passada, sem duplicar por termo", async () => {
    const resumo = await casarDia({
      publicacoes,
      keywords: [],
      temas: [
        // dois termos do mesmo tema casando a mesma publicação → 1 par só
        { slug: "fomento", nome: "Fomento", descricao: "", termos: ["termo de fomento", "edital de fomento"] },
        { slug: "colaboracao", nome: "Colaboração", descricao: "", termos: ["termo de colaboração"] },
      ],
      buscarDetalhe: async (slug) =>
        detalheFake(
          slug,
          slug === "a" ? "assinado o TERMO DE FOMENTO via edital de fomento nº 3" : "nada",
        ),
    });
    expect(resumo.temasCasados).toEqual([{ pubSlug: "a", tema: "fomento" }]);
    expect(resumo.matches).toHaveLength(0); // tema não vira alerta de assinante
    expect(resumo.casadas).toHaveLength(0); // tema não persiste content
  });

  it("content persiste apenas para quem casou", async () => {
    const resumo = await casarDia({
      publicacoes,
      keywords: [kw("1", "aviso")],
      buscarDetalhe: async (slug) => detalheFake(slug, `conteúdo de ${slug}`),
    });
    // "a" tem título AVISO QUALQUER — casa e persiste; extrato (c) não casa "aviso"
    expect(resumo.casadas.map((c) => c.slug)).toEqual(["a"]);
    expect(resumo.casadas[0]!.content).toBe("conteúdo de a");
  });

  it("extrato/resultado NÃO viram alerta, mas temas SEO ainda classificam", async () => {
    const pubs: PublicacaoDoDia[] = [
      { slug: "x", titulo: "RESULTADO FINAL DO CHAMAMENTO PÚBLICO", excerpt: null },
      { slug: "y", titulo: "EDITAL PARA CHAMAMENTO PÚBLICO Nº 1", excerpt: null },
    ];
    const resumo = await casarDia({
      publicacoes: pubs,
      keywords: [kw("1", "chamamento publico")],
      temas: [{ slug: "chamamento-publico", nome: "C", descricao: "", termos: ["chamamento público"] }],
      buscarDetalhe: async (slug) => detalheFake(slug, "texto com chamamento público"),
    });
    expect(resumo.matches.map((m) => m.slug)).toEqual(["y"]);
    expect(resumo.temasCasados.map((t) => t.pubSlug).sort()).toEqual(["x", "y"]);
  });
});
