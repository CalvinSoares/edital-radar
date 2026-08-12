import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  extrairChavesEdital,
  pareceRetificacao,
  vincularRetificacao,
} from "./retificacao";

const dir = dirname(fileURLToPath(import.meta.url));
const fixtures = JSON.parse(
  readFileSync(join(dir, "../../../fixtures/rotulados/retificacao.json"), "utf8"),
) as {
  casos: {
    nome: string;
    tituloRetificacao: string;
    hierarchy: string | null;
    anteriores: {
      alertaId: string;
      assinanteId: string;
      titulo: string;
      hierarchy: string | null;
    }[];
    esperadoAlertaId: string | null;
  }[];
};

describe("pareceRetificacao", () => {
  it("detecta retificação e republicação", () => {
    expect(pareceRetificacao("RETIFICAÇÃO DO EDITAL")).toBe(true);
    expect(pareceRetificacao("REPUBLICAÇÃO DO CREDENCIAMENTO")).toBe(true);
    expect(pareceRetificacao("EDITAL DE CHAMAMENTO Nº 1/2026")).toBe(false);
  });
});

describe("extrairChavesEdital", () => {
  it("normaliza nº/ano", () => {
    expect(extrairChavesEdital("EDITAL Nº 005/2026")).toContain("5/2026");
    expect(extrairChavesEdital("Chamamento 14/26")).toContain("14/2026");
  });
});

describe("vincularRetificacao (fixtures)", () => {
  for (const c of fixtures.casos) {
    it(c.nome, () => {
      const v = vincularRetificacao(c.tituloRetificacao, c.hierarchy, c.anteriores);
      expect(v?.alertaId ?? null).toBe(c.esperadoAlertaId);
    });
  }
});
