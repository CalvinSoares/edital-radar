// Catálogo fechado do plano Radar — causas e regiões.
// Tema novo só entra com termos revisados (mesmo critério do SEO).

export type CausaDoCatalogo = {
  slug: string;
  nome: string;
  /** Termos que indicam a causa no texto do DOE. */
  termos: string[];
};

export type RegiaoDoCatalogo = {
  slug: string;
  nome: string;
  /**
   * Como casar a região na publicação:
   * - todo-sp: qualquer lugar
   * - municipio: slug DOE `municipios/{slug}/…` (slug === id da região)
   * - trecho: hierarchy/slug contém um destes pedaços (normalizado)
   */
  regra: { tipo: "todo-sp" } | { tipo: "municipio"; municipioSlug: string } | { tipo: "trecho"; trechos: string[] };
};

export const CATALOGO_DE_CAUSAS: CausaDoCatalogo[] = [
  {
    slug: "assistencia-social",
    nome: "Assistência social",
    termos: ["assistência social", "assistencia social", "proteção social", "CRAS", "CREAS"],
  },
  {
    slug: "crianca-adolescente",
    nome: "Criança e adolescente",
    termos: ["criança e adolescente", "crianca e adolescente", "CONDECA", "ECA", "infância"],
  },
  {
    slug: "cultura",
    nome: "Cultura",
    termos: ["cultura", "patrimônio cultural", "patrimonio cultural", "audiovisual"],
  },
  {
    slug: "esporte",
    nome: "Esporte",
    termos: ["esporte", "atividade física", "atividade fisica", "lazer"],
  },
  {
    slug: "educacao",
    nome: "Educação",
    termos: ["educação", "educacao", "ensino", "alfabetização"],
  },
  {
    slug: "meio-ambiente",
    nome: "Meio ambiente",
    termos: ["meio ambiente", "sustentabilidade", "ambiental"],
  },
  {
    slug: "saude",
    nome: "Saúde",
    termos: ["saúde", "saude", "APS", "atenção básica", "atencao basica"],
  },
];

export const CATALOGO_DE_REGIOES: RegiaoDoCatalogo[] = [
  { slug: "todo-sp", nome: "Todo o Estado de SP", regra: { tipo: "todo-sp" } },
  {
    slug: "capital",
    nome: "Capital (São Paulo)",
    regra: { tipo: "trecho", trechos: ["sao paulo", "capital", "municipios/sao-paulo/"] },
  },
  {
    slug: "grande-sp",
    nome: "Grande São Paulo",
    regra: {
      tipo: "trecho",
      trechos: [
        "grande sao paulo",
        "guarulhos",
        "osasco",
        "santo andre",
        "sao bernardo",
        "sao caetano",
        "diadema",
        "mauá",
        "maua",
        "suzano",
        "mogi das cruzes",
        "barueri",
        "carapicuiba",
        "itapevi",
        "cotia",
        "taboao",
      ],
    },
  },
  {
    slug: "interior",
    nome: "Interior",
    regra: { tipo: "trecho", trechos: ["interior", "campinas", "ribeirao preto", "bauru", "sorocaba", "piracicaba"] },
  },
  {
    slug: "litoral",
    nome: "Litoral",
    regra: { tipo: "trecho", trechos: ["litoral", "santos", "guaruja", "praia grande", "sao vicente", "mongagua"] },
  },
];

export function causaPorSlug(slug: string): CausaDoCatalogo | undefined {
  return CATALOGO_DE_CAUSAS.find((c) => c.slug === slug);
}

export function regiaoPorSlug(slug: string): RegiaoDoCatalogo | undefined {
  return CATALOGO_DE_REGIOES.find((r) => r.slug === slug);
}

/** Teto anti-abuso (piloto grátis — sem limite de plano). */
export const LIMITE_ASSUNTOS_POR_ASSINANTE = 50;
export const LIMITE_CAUSAS_POR_PERFIL = 3;
export const LIMITE_REGIOES_POR_PERFIL = 3;
