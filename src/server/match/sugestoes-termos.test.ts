import { describe, expect, it } from "vitest";
import { sugestoesDeTermos } from "./sugestoes-termos";

describe("sugestoesDeTermos", () => {
  it("omite termos já vigiados", () => {
    const s = sugestoesDeTermos(["chamamento público", "cultura"], 10);
    expect(s.every((x) => x.termo.toLowerCase() !== "chamamento público")).toBe(true);
    expect(s.every((x) => x.termo.toLowerCase() !== "cultura")).toBe(true);
    expect(s.length).toBeGreaterThan(0);
  });

  it("respeita o limite", () => {
    expect(sugestoesDeTermos([], 3)).toHaveLength(3);
  });
});
