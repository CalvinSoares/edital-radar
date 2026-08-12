import type { ItemDeBusca } from "./cliente-doe";

export type PublicacaoNormalizada = {
  slug: string;
  titulo: string;
  excerpt: string | null;
  dataPublicacao: Date;
  hierarchy: string | null;
  publicationTypeId: string | null;
  bruto: ItemDeBusca;
};

/**
 * A API devolve `date` sem offset ("2026-08-11T01:00:38.8780019") — é horário
 * local de São Paulo. Normalizamos na borda: trunca a fração para ms e fixa
 * o offset -03:00 (SP não tem horário de verão desde 2019).
 */
const FORMATO_DOE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/;

export function parseDataDoe(data: string): Date {
  // Formato estrito: o parser do V8 aceita lixo ("11/08/2026") em silêncio.
  if (!FORMATO_DOE.test(data)) throw new Error(`Data do DOE não reconhecida: ${data}`);
  const semFracaoLonga = data.replace(/\.(\d{1,3})\d*/, ".$1");
  const d = new Date(`${semFracaoLonga}-03:00`);
  if (Number.isNaN(d.getTime())) throw new Error(`Data do DOE não reconhecida: ${data}`);
  return d;
}

export function normalizarItem(item: ItemDeBusca): PublicacaoNormalizada {
  return {
    slug: item.slug,
    titulo: item.title.trim(),
    excerpt: item.excerpt?.trim() || null,
    dataPublicacao: parseDataDoe(item.date),
    hierarchy: item.hierarchy ?? null,
    publicationTypeId: item.publicationTypeId ?? null,
    bruto: item,
  };
}
