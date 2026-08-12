import { describe, expect, it } from "vitest";
import { extrairPrazo, prazoUrgente } from "./prazo";

describe("extrairPrazo", () => {
  const agora = new Date("2026-08-12T15:00:00-03:00");

  it("extrai prazo futuro", () => {
    const p = extrairPrazo("Inscrições até 20/08/2026 no protocolo", agora);
    expect(p).not.toBeNull();
    expect(p!.vencido).toBe(false);
    expect(p!.trecho.toLowerCase()).toContain("20/08/2026");
  });

  it("marca prazo vencido", () => {
    const p = extrairPrazo("Prazo final: 01/08/2026", agora);
    expect(p?.vencido).toBe(true);
  });

  it("urgencia <48h", () => {
    const p = extrairPrazo("Entrega até 13/08/2026", agora);
    expect(prazoUrgente(p, agora)).toBe(true);
  });
});
