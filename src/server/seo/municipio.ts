// Extrai município do slug do DOE: `municipios/{slug-cidade}/…`
// Páginas SEO /municipios/[slug] e /temas/[tema]/[municipio].

export function municipioDoSlugPublicacao(
  slug: string,
): { slug: string; nome: string } | null {
  const m = /^municipios\/([^/]+)\//i.exec(slug);
  if (!m?.[1]) return null;
  return { slug: m[1].toLowerCase(), nome: humanizarSlugMunicipio(m[1]) };
}

/** "lencois-paulista" → "Lencois Paulista" (sem inventar acento). */
export function humanizarSlugMunicipio(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

export function slugMunicipioValido(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}
