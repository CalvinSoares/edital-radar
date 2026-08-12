import type { APIRoute } from "astro";
import { CATALOGO_DE_TEMAS } from "~/server/match/temas";

export const prerender = false;

export const GET: APIRoute = async () => {
  const site = (import.meta.env.SITE_URL ?? "https://editalradar.com.br").replace(/\/$/, "");
  const hoje = new Date().toISOString().slice(0, 10);

  let municipios: { slug: string }[] = [];
  try {
    const { db } = await import("~/server/db/cliente");
    const { listarMunicipiosComTemas } = await import("~/server/db/repositorios/municipios");
    municipios = await listarMunicipiosComTemas(db, 30, 80);
  } catch {
    // sitemap não pode cair se o banco estiver fora — lista só o estático
  }

  const urls = [
    { loc: `${site}/`, prioridade: "1.0", changefreq: "weekly" },
    { loc: `${site}/status`, prioridade: "0.5", changefreq: "daily" },
    { loc: `${site}/temas`, prioridade: "0.9", changefreq: "daily" },
    { loc: `${site}/municipios`, prioridade: "0.9", changefreq: "daily" },
    ...CATALOGO_DE_TEMAS.map((t) => ({
      loc: `${site}/temas/${t.slug}`,
      prioridade: "0.8",
      changefreq: "daily",
    })),
    ...municipios.map((m) => ({
      loc: `${site}/municipios/${m.slug}`,
      prioridade: "0.7",
      changefreq: "daily",
    })),
    ...municipios.flatMap((m) =>
      CATALOGO_DE_TEMAS.map((t) => ({
        loc: `${site}/temas/${t.slug}/${m.slug}`,
        prioridade: "0.65",
        changefreq: "daily",
      })),
    ),
    { loc: `${site}/entrar`, prioridade: "0.6", changefreq: "monthly" },
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${hoje}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.prioridade}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
