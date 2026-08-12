// @ts-check
import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // SSR por padrão; páginas públicas marcam `export const prerender = true`.
  output: "server",
  // maxDuration alto por causa do /api/coleta: ~3,3k detalhes do DOE por dia.
  adapter: vercel({ maxDuration: 300 }),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
