import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { casarKeywords, type PublicacaoParaMatch } from "./casar-keywords";
import { normalizarPreservandoIndices, normalizarTermo } from "./normalizar-texto";

type CasoRotulado = {
  nome: string;
  publicacao: { slug: string; titulo: string; excerpt: string | null };
  termo: string;
  esperado: { casa: boolean; campo?: string };
};

const { casos } = JSON.parse(
  readFileSync(new URL("../../../fixtures/rotulados/match-keywords.json", import.meta.url), "utf8"),
) as { casos: CasoRotulado[] };

function keywordDe(termo: string) {
  return { id: "kw-1", assinanteId: "as-1", termo };
}

describe("casos rotulados (fixtures/rotulados/match-keywords.json)", () => {
  for (const caso of casos) {
    it(caso.nome, () => {
      const resultados = casarKeywords(caso.publicacao, [keywordDe(caso.termo)]);
      if (caso.esperado.casa) {
        expect(resultados).toHaveLength(1);
        expect(resultados[0]!.campo).toBe(caso.esperado.campo);
        expect(resultados[0]!.trecho.length).toBeGreaterThan(0);
      } else {
        expect(resultados).toHaveLength(0);
      }
    });
  }
});

describe("normalizarPreservandoIndices", () => {
  it("preserva o comprimento (índices continuam válidos no original)", () => {
    const original = "Crédito à ORGANIZAÇÃO — ação nº 12";
    expect(normalizarPreservandoIndices(original)).toHaveLength(original.length);
  });

  it("remove acento e baixa a caixa", () => {
    expect(normalizarPreservandoIndices("LICITAÇÃO Pública")).toBe("licitacao publica");
  });
});

describe("normalizarTermo", () => {
  it("colapsa espaços e apara as pontas", () => {
    expect(normalizarTermo("  Edital   de\nFomento ")).toBe("edital de fomento");
  });
});

describe("casarKeywords — comportamento", () => {
  const pub: PublicacaoParaMatch = {
    slug: "executivo/teste",
    titulo: "AVISO DE CHAMAMENTO PÚBLICO",
    excerpt: "O órgão torna público o chamamento para credenciamento de organizações da sociedade civil interessadas em firmar parceria.",
  };

  it("devolve um resultado por keyword que casou", () => {
    const resultados = casarKeywords(pub, [
      { id: "kw-1", assinanteId: "as-1", termo: "chamamento" },
      { id: "kw-2", assinanteId: "as-2", termo: "sociedade civil" },
      { id: "kw-3", assinanteId: "as-1", termo: "vacina" },
    ]);
    expect(resultados.map((r) => r.keywordId)).toEqual(["kw-1", "kw-2"]);
  });

  it("o trecho vem do texto original, legível, com o termo dentro", () => {
    const [r] = casarKeywords(pub, [keywordDe("credenciamento")]);
    expect(r!.trecho).toContain("credenciamento"); // texto original, não normalizado
  });

  it("ocorrência longe do início ganha reticências à esquerda", () => {
    // "parceria" começa depois da janela de 80 caracteres do trecho
    const [r] = casarKeywords(pub, [keywordDe("parceria")]);
    expect(r!.trecho.startsWith("…")).toBe(true);
    expect(r!.trecho).toContain("parceria");
  });

  it("é determinístico (função pura)", () => {
    const a = casarKeywords(pub, [keywordDe("chamamento")]);
    const b = casarKeywords(pub, [keywordDe("chamamento")]);
    expect(a).toEqual(b);
  });
});
