import type { APIRoute } from "astro";

export const prerender = false;

/**
 * Webhook Resend (Svix): bounce permanente / reclamação → supressão.
 * Auth = assinatura nos headers svix-*; sem secret configurado → 503.
 */
export const POST: APIRoute = async ({ request }) => {
  const secret = import.meta.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    return new Response(JSON.stringify({ erro: "webhook não configurado" }), { status: 503 });
  }

  const rawBody = await request.text();
  const { verificarAssinaturaSvix, emailsParaSuprimir } = await import(
    "../../server/alerta/webhook-resend"
  );

  const ok = verificarAssinaturaSvix(
    rawBody,
    {
      id: request.headers.get("svix-id") ?? "",
      timestamp: request.headers.get("svix-timestamp") ?? "",
      signature: request.headers.get("svix-signature") ?? "",
    },
    secret,
  );
  if (!ok) {
    return new Response(JSON.stringify({ erro: "assinatura inválida" }), { status: 400 });
  }

  let evento: unknown;
  try {
    evento = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ erro: "json inválido" }), { status: 400 });
  }

  const emails = emailsParaSuprimir(evento as Parameters<typeof emailsParaSuprimir>[0]);
  if (emails.length === 0) {
    return new Response(JSON.stringify({ ok: true, suprimidos: 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { db } = await import("../../server/db/cliente");
  const { suprimirPorEmails } = await import("../../server/db/repositorios/assinantes");
  const suprimidos = await suprimirPorEmails(db, emails);

  return new Response(JSON.stringify({ ok: true, suprimidos }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
