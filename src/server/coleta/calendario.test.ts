import { describe, expect, it } from "vitest";
import { decidirStatus, diaDaSemana, ehFimDeSemana, hojeEmSaoPaulo } from "./calendario";

describe("diaDaSemana / ehFimDeSemana", () => {
  it("identifica dias reais de 2026", () => {
    expect(diaDaSemana("2026-08-09")).toBe(0); // domingo
    expect(diaDaSemana("2026-08-10")).toBe(1); // segunda
    expect(diaDaSemana("2026-08-08")).toBe(6); // sábado
    expect(ehFimDeSemana("2026-08-08")).toBe(true);
    expect(ehFimDeSemana("2026-08-09")).toBe(true);
    expect(ehFimDeSemana("2026-08-11")).toBe(false);
  });
});

describe("hojeEmSaoPaulo", () => {
  it("converte UTC para o dia certo em SP (UTC-3)", () => {
    // 01:30 UTC de 12/08 ainda é 22:30 de 11/08 em SP
    expect(hojeEmSaoPaulo(new Date("2026-08-12T01:30:00Z"))).toBe("2026-08-11");
    expect(hojeEmSaoPaulo(new Date("2026-08-12T12:00:00Z"))).toBe("2026-08-12");
  });
});

describe("decidirStatus", () => {
  it("coleta com itens é ok em qualquer dia", () => {
    expect(decidirStatus(3200, "2026-08-11")).toBe("ok");
  });
  it("zero em fim de semana é sem_edicao (DOE não circula)", () => {
    expect(decidirStatus(0, "2026-08-09")).toBe("sem_edicao");
  });
  it("zero em dia útil é erro (alarme, nunca silêncio)", () => {
    expect(decidirStatus(0, "2026-08-11")).toBe("erro");
  });
});
