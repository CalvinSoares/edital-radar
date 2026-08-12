// Auth do backoffice interno. Cookie httpOnly com HMAC do ADMIN_SECRET
// (nunca o secret em claro). Sem secret configurado → admin off.

import type { AstroCookies } from "astro";
import { igualComTempoConstante, tokenDoCookieAdmin } from "~/server/seguranca/crypto-admin";

export const COOKIE_DE_ADMIN = "er_admin";

export function adminConfigurado(): boolean {
  return Boolean(import.meta.env.ADMIN_SECRET);
}

export function opcoesDoCookieAdmin() {
  return {
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: import.meta.env.PROD,
    maxAge: 60 * 60 * 8, // 8h — sessão admin curta
  };
}

export function adminAutenticado(cookies: AstroCookies): boolean {
  const secret = import.meta.env.ADMIN_SECRET;
  if (!secret) return false;
  const got = cookies.get(COOKIE_DE_ADMIN)?.value;
  if (!got) return false;
  return igualComTempoConstante(got, tokenDoCookieAdmin(secret));
}
