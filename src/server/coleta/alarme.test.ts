import { describe, expect, it } from "vitest";
import { precisaAlarme, renderizarAlarme } from "./alarme";

describe("precisaAlarme", () => {
  it("dispara só em status erro", () => {
    expect(precisaAlarme({ dataAlvo: "2026-08-12", status: "erro", totalColetado: 0, erro: "x" })).toBe(
      true,
    );
    expect(
      precisaAlarme({ dataAlvo: "2026-08-12", status: "ok", totalColetado: 3000, erro: null }),
    ).toBe(false);
    expect(
      precisaAlarme({ dataAlvo: "2026-08-09", status: "sem_edicao", totalColetado: 0, erro: null }),
    ).toBe(false);
  });
});

describe("renderizarAlarme", () => {
  it("inclui data, total e motivo", () => {
    const msg = renderizarAlarme({
      dataAlvo: "2026-08-12",
      status: "erro",
      totalColetado: 0,
      erro: "0 publicações em dia útil",
    });
    expect(msg.assunto).toContain("2026-08-12");
    expect(msg.texto).toContain("Total coletado: 0");
    expect(msg.texto).toContain("0 publicações em dia útil");
  });
});
