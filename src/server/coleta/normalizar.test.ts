import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PaginaDeBuscaSchema } from "./cliente-doe";
import { normalizarItem, parseDataDoe } from "./normalizar";

const fixture: unknown = JSON.parse(
  readFileSync(new URL("../../../fixtures/doe/pagina-busca-2026-08-11.json", import.meta.url), "utf8"),
);

describe("contrato da API do DOE (fixture real de 2026-08-11)", () => {
  it("a resposta real passa no schema Zod", () => {
    const pagina = PaginaDeBuscaSchema.parse(fixture);
    expect(pagina.items).toHaveLength(5);
    expect(pagina.totalItems).toBeGreaterThan(3000);
    expect(pagina.hasNextPage).toBe(true);
  });

  it("todo item da fixture normaliza sem perder o bruto", () => {
    const pagina = PaginaDeBuscaSchema.parse(fixture);
    for (const item of pagina.items) {
      const row = normalizarItem(item);
      expect(row.slug).toBe(item.slug);
      expect(row.titulo.length).toBeGreaterThan(0);
      expect(row.bruto).toEqual(item); // o payload inteiro vai para o jsonb
      expect(row.dataPublicacao.getTime()).not.toBeNaN();
    }
  });
});

describe("parseDataDoe", () => {
  it("trata o horário sem offset como America/Sao_Paulo (-03:00)", () => {
    const d = parseDataDoe("2026-08-11T01:00:38.8780019");
    expect(d.toISOString()).toBe("2026-08-11T04:00:38.878Z");
  });

  it("aceita data sem fração", () => {
    const d = parseDataDoe("2026-08-11T01:00:38");
    expect(d.toISOString()).toBe("2026-08-11T04:00:38.000Z");
  });

  it("falha alto em formato desconhecido", () => {
    expect(() => parseDataDoe("11/08/2026")).toThrow();
  });
});
