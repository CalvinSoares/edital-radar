// Catálogo de temas das páginas públicas de SEO — regras determinísticas,
// casadas com o MESMO motor dos assinantes (fronteira de palavra, sem
// sensibilidade a acento). Tema novo só entra com termos revisados: página
// pública com falso positivo queima credibilidade.

export type TemaDoCatalogo = {
  /** Slug da URL: /temas/[slug] */
  slug: string;
  nome: string;
  /** Frase humana da página — sem burocratês seco. */
  descricao: string;
  /** Qualquer um destes termos casa a publicação no tema. */
  termos: string[];
};

export const CATALOGO_DE_TEMAS: TemaDoCatalogo[] = [
  {
    slug: "chamamento-publico",
    nome: "Chamamentos públicos",
    descricao:
      "Quando o governo abre seleção para parcerias com organizações da sociedade civil — o principal caminho de fomento para ONGs.",
    termos: ["chamamento público"],
  },
  {
    slug: "fomento",
    nome: "Termos e editais de fomento",
    descricao:
      "Publicações sobre repasse de recursos públicos para projetos de organizações — assinaturas, aditamentos e editais.",
    termos: ["termo de fomento", "edital de fomento"],
  },
  {
    slug: "colaboracao",
    nome: "Termos de colaboração",
    descricao:
      "Parcerias em que a administração propõe o projeto e a organização executa com recurso público.",
    termos: ["termo de colaboração"],
  },
  {
    slug: "sociedade-civil",
    nome: "Organizações da sociedade civil",
    descricao:
      "Tudo que cita OSCs no Diário Oficial — habilitações, resultados, prestações de contas e convocações.",
    termos: ["organização da sociedade civil", "organizações da sociedade civil"],
  },
  {
    slug: "credenciamento",
    nome: "Credenciamentos",
    descricao:
      "Aberturas de credenciamento — quando qualquer interessado que cumpra os requisitos pode entrar.",
    termos: ["credenciamento"],
  },
];

export function temaPorSlug(slug: string): TemaDoCatalogo | undefined {
  return CATALOGO_DE_TEMAS.find((t) => t.slug === slug);
}
