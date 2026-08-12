// Sugestões de onboarding — termos que a coordenadora costuma vigiar.
// Inclui atalhos do catálogo de temas + causas comuns (sem jargão seco).

import { CATALOGO_DE_TEMAS } from "./temas";

export type SugestaoDeTermo = {
  termo: string;
  rotulo: string;
};

const CAUSAS: SugestaoDeTermo[] = [
  { termo: "criança", rotulo: "Criança e adolescente" },
  { termo: "cultura", rotulo: "Cultura" },
  { termo: "esporte", rotulo: "Esporte" },
  { termo: "assistência social", rotulo: "Assistência social" },
  { termo: "meio ambiente", rotulo: "Meio ambiente" },
  { termo: "educação", rotulo: "Educação" },
];

/** Sugestões ainda não vigiadas, limitadas ao que cabe no plano free. */
export function sugestoesDeTermos(jaVigiados: readonly string[], limite = 6): SugestaoDeTermo[] {
  const normalizados = new Set(jaVigiados.map((t) => t.trim().toLowerCase()));

  const doCatalogo: SugestaoDeTermo[] = CATALOGO_DE_TEMAS.map((t) => ({
    termo: t.termos[0]!,
    rotulo: t.nome,
  }));

  const todas = [...doCatalogo, ...CAUSAS];
  return todas.filter((s) => !normalizados.has(s.termo.toLowerCase())).slice(0, limite);
}
