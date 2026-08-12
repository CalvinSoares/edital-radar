import { describe, expect, it } from "vitest";
import {
  humanizarSlugMunicipio,
  municipioDoSlugPublicacao,
  slugMunicipioValido,
} from "./municipio";

describe("municipioDoSlugPublicacao", () => {
  it("extrai de slug municipal", () => {
    expect(
      municipioDoSlugPublicacao(
        "municipios/lencois-paulista/chamamento-n001-2026-20260811313071292042363",
      ),
    ).toEqual({ slug: "lencois-paulista", nome: "Lencois Paulista" });
  });

  it("ignora slug estadual/executivo", () => {
    expect(
      municipioDoSlugPublicacao("executivo/secretaria-da-educacao/retificacao-x"),
    ).toBeNull();
  });
});

describe("humanizarSlugMunicipio / slugMunicipioValido", () => {
  it("formata e valida", () => {
    expect(humanizarSlugMunicipio("campos-do-jordao")).toBe("Campos Do Jordao");
    expect(slugMunicipioValido("sao-paulo")).toBe(true);
    expect(slugMunicipioValido("../x")).toBe(false);
  });
});
