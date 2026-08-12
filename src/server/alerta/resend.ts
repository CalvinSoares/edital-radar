// Cliente de e-mail (Resend via HTTP). Invariante: e-mail real SÓ quando
// RESEND_MODE=real — qualquer outro valor é dry-run (loga e não envia).

export type MensagemDeEmail = {
  para: string;
  assunto: string;
  html: string;
  texto: string;
  urlDescadastro: string;
};

export type ClienteDeEmail = {
  enviar: (msg: MensagemDeEmail) => Promise<{ id: string }>;
};

export function criarClienteDeEmail(config: {
  apiKey: string | undefined;
  modo: string | undefined;
  remetente: string;
  log?: (m: string) => void;
}): ClienteDeEmail {
  const { apiKey, modo, remetente, log = () => {} } = config;

  if (modo !== "real") {
    return {
      async enviar(msg) {
        log(`[dry-run] e-mail para ${msg.para}: "${msg.assunto}"`);
        return { id: `dry-run-${msg.para}` };
      },
    };
  }

  if (!apiKey) throw new Error("RESEND_MODE=real exige RESEND_API_KEY");

  return {
    async enviar(msg) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: remetente,
          to: [msg.para],
          subject: msg.assunto,
          html: msg.html,
          text: msg.texto,
          headers: {
            "List-Unsubscribe": `<${msg.urlDescadastro}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        }),
      });
      if (!res.ok) {
        const corpo = await res.text();
        throw new Error(`Resend respondeu HTTP ${res.status}: ${corpo.slice(0, 200)}`);
      }
      const json = (await res.json()) as { id: string };
      return { id: json.id };
    },
  };
}
