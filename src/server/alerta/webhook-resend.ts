// Verificação Svix (Resend webhooks) com crypto nativo — sem SDK.
// Assinatura: HMAC-SHA256(base64) de `${id}.${timestamp}.${rawBody}`
// com a chave em base64 após o prefixo `whsec_`.

import { createHmac, timingSafeEqual } from "node:crypto";

const JANELA_SEGUNDOS = 5 * 60;

export type HeadersSvix = {
  id: string;
  timestamp: string;
  signature: string;
};

export function verificarAssinaturaSvix(
  rawBody: string,
  headers: HeadersSvix,
  secret: string,
): boolean {
  if (!headers.id || !headers.timestamp || !headers.signature) return false;

  const ts = Number(headers.timestamp);
  if (!Number.isFinite(ts)) return false;
  const agora = Math.floor(Date.now() / 1000);
  if (Math.abs(agora - ts) > JANELA_SEGUNDOS) return false;

  const chave = chaveDoSegredo(secret);
  const payload = `${headers.id}.${headers.timestamp}.${rawBody}`;
  const esperado = createHmac("sha256", chave).update(payload, "utf8").digest("base64");

  // Header pode trazer várias assinaturas: "v1,xxx v1,yyy"
  const candidatas = headers.signature
    .split(" ")
    .map((p) => p.trim())
    .filter((p) => p.startsWith("v1,"))
    .map((p) => p.slice(3));

  const esperadoBuf = Buffer.from(esperado);
  for (const c of candidatas) {
    const buf = Buffer.from(c);
    if (buf.length === esperadoBuf.length && timingSafeEqual(buf, esperadoBuf)) {
      return true;
    }
  }
  return false;
}

function chaveDoSegredo(secret: string): Buffer {
  const semPrefixo = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  return Buffer.from(semPrefixo, "base64");
}

/** Eventos que devem suprimir o destinatário de forma permanente. */
export function emailsParaSuprimir(evento: {
  type?: string;
  data?: {
    to?: string[];
    bounce?: { type?: string };
    email?: string;
  };
}): string[] {
  const tipo = evento.type;
  const data = evento.data ?? {};

  if (tipo === "email.complained" || tipo === "email.suppressed") {
    return normalizarLista(data.to);
  }

  if (tipo === "suppression.added" && typeof data.email === "string") {
    return [data.email.trim().toLowerCase()].filter(Boolean);
  }

  if (tipo === "email.bounced") {
    // Soft bounce (Temporary) NÃO suprime — só hard bounce.
    const bounceType = data.bounce?.type;
    if (bounceType && bounceType !== "Permanent") return [];
    return normalizarLista(data.to);
  }

  return [];
}

function normalizarLista(to: string[] | undefined): string[] {
  if (!Array.isArray(to)) return [];
  return [...new Set(to.map((e) => e.trim().toLowerCase()).filter(Boolean))];
}
