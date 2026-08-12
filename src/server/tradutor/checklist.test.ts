import { describe, expect, it } from "vitest";
import {
  detectarModalidade,
  montarChecklist,
  resumirChecklist,
} from "./checklist";

describe("tradutor checklist", () => {
  it("detecta modalidade", () => {
    expect(detectarModalidade("Chamamento público nº 1")).toBe("chamamento");
    expect(detectarModalidade("Edital de credenciamento")).toBe("credenciamento");
  });

  it("monta itens base + extra", () => {
    const itens = montarChecklist("Chamamento público");
    expect(itens.some((i) => i.id === "osc")).toBe(true);
    expect(itens.some((i) => i.id === "publico")).toBe(true);
  });

  it("resume respostas", () => {
    const itens = montarChecklist("Edital genérico");
    const incompleto = resumirChecklist(itens, { osc: "sim" });
    expect(incompleto.tom).toBe("incompleto");

    const todasSim: Record<string, "sim"> = Object.fromEntries(
      itens.map((i) => [i.id, "sim" as const]),
    );
    expect(resumirChecklist(itens, todasSim).tom).toBe("positivo");
  });
});
