import { describe, expect, it } from "vitest";
import { casarPerfil, casaRegiao } from "./casar-perfil";

describe("casaRegiao", () => {
  it("todo-sp sempre casa", () => {
    expect(
      casaRegiao(
        { slug: "x", titulo: "t", excerpt: null },
        { slug: "todo-sp", nome: "Todo", regra: { tipo: "todo-sp" } },
      ),
    ).toBe(true);
  });

  it("capital casa município SP", () => {
    expect(
      casaRegiao(
        {
          slug: "municipios/sao-paulo/edital-x",
          titulo: "Edital",
          excerpt: null,
          hierarchy: "Municípios > São Paulo",
        },
        {
          slug: "capital",
          nome: "Capital",
          regra: { tipo: "trecho", trechos: ["sao paulo", "municipios/sao-paulo/"] },
        },
      ),
    ).toBe(true);
  });
});

describe("casarPerfil", () => {
  const agora = new Date("2026-08-12T12:00:00-03:00");

  it("casa causa + região e gera resumo", () => {
    const hit = casarPerfil(
      {
        slug: "municipios/campinas/chamamento-cultura-2026",
        titulo: "EDITAL DE CHAMAMENTO PÚBLICO DE CULTURA",
        excerpt: "Seleção de organizações para projetos culturais no interior",
        hierarchy: "Municípios > Campinas",
        content: "Prazo de inscrição até 30/09/2026. Cultura e patrimônio.",
      },
      {
        assinanteId: "as-1",
        causas: ["cultura"],
        regioes: ["interior"],
      },
      agora,
    );
    expect(hit).not.toBeNull();
    expect(hit!.origem).toBe("perfil");
    expect(hit!.causaSlug).toBe("cultura");
    expect(hit!.resumo.toLowerCase()).toContain("cultura");
    expect(hit!.prazoEm).not.toBeNull();
    expect(hit!.keywordId).toBeNull();
  });

  it("não alerta se prazo já venceu", () => {
    const hit = casarPerfil(
      {
        slug: "executivo/x/chamamento",
        titulo: "CHAMAMENTO PÚBLICO CULTURA",
        excerpt: "cultura",
        content: "Inscrições até 01/07/2026",
      },
      { assinanteId: "as-1", causas: ["cultura"], regioes: ["todo-sp"] },
      agora,
    );
    expect(hit).toBeNull();
  });

  it("bloqueia extrato mesmo com causa", () => {
    const hit = casarPerfil(
      {
        slug: "x",
        titulo: "EXTRATO DE CHAMAMENTO PÚBLICO DE CULTURA",
        excerpt: "cultura",
        content: "cultura",
      },
      { assinanteId: "as-1", causas: ["cultura"], regioes: ["todo-sp"] },
      agora,
    );
    expect(hit).toBeNull();
  });
});
