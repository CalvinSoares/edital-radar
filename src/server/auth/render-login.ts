// E-mail do magic-link — PURO.

export function renderizarEmailDeLogin(urlDeEntrada: string): {
  assunto: string;
  html: string;
  texto: string;
} {
  const assunto = "Seu link de acesso ao Edital Radar";
  const html = `
  <div style="max-width:600px;margin:0 auto;font-family:system-ui,'Segoe UI',Roboto,sans-serif;color:#1a2433;padding:24px 16px;">
    <p style="font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#6d7482;margin:0 0 4px 0;">Edital Radar</p>
    <h1 style="font-size:20px;margin:0 0 16px 0;">Entre com um clique</h1>
    <p style="font-size:14px;color:#4a5261;line-height:1.5;">Use o botão abaixo para entrar no seu painel. O link vale por 15 minutos e funciona uma única vez.</p>
    <p style="margin:24px 0;">
      <a href="${urlDeEntrada}" style="background:#2456c9;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:bold;display:inline-block;">Entrar no painel</a>
    </p>
    <p style="font-size:12px;color:#6d7482;line-height:1.5;">Se você não pediu este e-mail, pode ignorar — nada acontece sem o clique.</p>
  </div>`;
  const texto = [
    "Entre no Edital Radar com o link abaixo (vale 15 minutos, uso único):",
    urlDeEntrada,
    "",
    "Se você não pediu este e-mail, ignore.",
  ].join("\n");
  return { assunto, html, texto };
}
