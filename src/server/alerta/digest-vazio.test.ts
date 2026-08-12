import { describe, expect, it } from "vitest";
import {
  deveEnviarDigestVazioHoje,
  renderizarDigestVazio,
  semanaIsoDe,
} from "./digest-vazio";

describe("digest vazio", () => {
  it("só sexta", () => {
    expect(deveEnviarDigestVazioHoje("2026-08-14")).toBe(true); // sexta
    expect(deveEnviarDigestVazioHoje("2026-08-13")).toBe(false); // quinta
  });

  it("semana ISO estável", () => {
    expect(semanaIsoDe("2026-08-14")).toMatch(/^2026-W\d{2}$/);
  });

  it("render tem assunto claro", () => {
    const e = renderizarDigestVazio("2026-08-14", "https://exemplo.test", "tok");
    expect(e.assunto).toMatch(/Nada do que você acompanha/i);
    expect(e.html).toContain("/painel");
    expect(e.texto).toContain("Descadastrar");
  });
});
