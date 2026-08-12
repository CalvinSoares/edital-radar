import { createHmac, timingSafeEqual } from "node:crypto";

/** Compara strings com tempo constante (quando comprimentos iguais). */
export function igualComTempoConstante(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/** Token de sessão admin derivado do secret — nunca grava o secret cru no cookie. */
export function tokenDoCookieAdmin(secret: string): string {
  return createHmac("sha256", secret).update("edital-radar-admin-v1").digest("hex");
}
