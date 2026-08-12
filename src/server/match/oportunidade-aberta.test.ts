import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ehOportunidadeAberta } from "./oportunidade-aberta";

type Caso = { titulo: string; aberta: boolean };

const casos: Caso[] = JSON.parse(
  readFileSync(new URL("../../../fixtures/rotulados/oportunidade-aberta.json", import.meta.url), "utf8"),
);

describe("ehOportunidadeAberta", () => {
  for (const c of casos) {
    it(`${c.aberta ? "ACEITA" : "BLOQUEIA"}: ${c.titulo.slice(0, 60)}`, () => {
      expect(ehOportunidadeAberta(c.titulo)).toBe(c.aberta);
    });
  }
});
