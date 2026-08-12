// Cookie de “ver como assinante” — só vale junto com admin autenticado.
// Mutações no painel ficam bloqueadas (somente leitura).

import type { AstroCookies } from "astro";
import { adminAutenticado } from "./admin";

export const COOKIE_DE_VISTA = "er_vista";

export function opcoesDoCookieVista() {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: import.meta.env.PROD,
    maxAge: 60 * 60, // 1 hora
  };
}

export function idVistaAdmin(cookies: AstroCookies): string | null {
  if (!adminAutenticado(cookies)) return null;
  const id = cookies.get(COOKIE_DE_VISTA)?.value;
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) return null;
  return id;
}
