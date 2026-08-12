// Ponte entre cookies (Astro) e a sessão no banco. Vive em shared porque
// toca o tipo AstroCookies — src/server/ fica livre de framework.

import type { AstroCookies } from "astro";
import type { SessaoAtiva } from "~/server/db/repositorios/auth";

export const COOKIE_DE_SESSAO = "er_sessao";

export function opcoesDoCookie() {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: import.meta.env.PROD,
    maxAge: 60 * 60 * 24 * 30, // 30 dias — igual à validade da sessão no banco
  };
}

export async function obterSessaoAtiva(cookies: AstroCookies): Promise<SessaoAtiva | null> {
  const sessaoId = cookies.get(COOKIE_DE_SESSAO)?.value;
  if (!sessaoId || !/^[0-9a-f-]{36}$/.test(sessaoId)) return null;
  const { db } = await import("~/server/db/cliente");
  const { obterSessao } = await import("~/server/db/repositorios/auth");
  return obterSessao(db, sessaoId);
}
