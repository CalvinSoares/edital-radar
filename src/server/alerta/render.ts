// Render do e-mail digest — PURO. Inline styles por exigência dos clientes
// de e-mail (exceção documentada em componentizacao.md).

import { regexDoTermo } from "../match/casar-keywords";
import { normalizarPreservandoIndices, normalizarTermo } from "../match/normalizar-texto";
import type { Digest } from "./selecionar";

export type EmailRenderizado = {
  assunto: string;
  html: string;
  texto: string;
};

function escaparHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** CAIXA ALTA do DOE → frase legível ("EXTRATO DE TERMO..." → "Extrato de termo..."). */
export function humanizarTitulo(titulo: string): string {
  const aparado = titulo.trim().replace(/\s+/g, " ");
  const letras = aparado.replace(/[^a-zA-ZÀ-ÿ]/g, "");
  const ehCaixaAlta = letras.length > 0 && letras === letras.toUpperCase();
  if (!ehCaixaAlta) return aparado;
  const minusculo = aparado.toLowerCase();
  return minusculo.charAt(0).toUpperCase() + minusculo.slice(1);
}

/** Escapa o trecho e envolve a ocorrência do termo em <strong>. */
export function destacarTermo(trecho: string, termo: string): string {
  const regex = regexDoTermo(normalizarTermo(termo));
  const m = regex.exec(normalizarPreservandoIndices(trecho));
  if (!m) return escaparHtml(trecho);
  const antes = trecho.slice(0, m.index);
  const ocorrencia = trecho.slice(m.index, m.index + m[0].length);
  const depois = trecho.slice(m.index + m[0].length);
  return `${escaparHtml(antes)}<strong>${escaparHtml(ocorrencia)}</strong>${escaparHtml(depois)}`;
}

function dataCurta(dataAlvo: string): string {
  const [, mes, dia] = dataAlvo.split("-");
  return `${dia}/${mes}`;
}

const DISCLAIMER =
  "O Edital Radar não substitui a leitura oficial. Sempre confira a publicação na fonte antes de agir.";

export function renderizarDigest(digest: Digest, dataAlvo: string, siteUrl: string): EmailRenderizado {
  const n = digest.avisos.length + digest.excedente;
  const plural = n === 1 ? "publicação" : "publicações";
  const assunto = `${n} ${plural} com seus termos — Diário Oficial de SP, ${dataCurta(dataAlvo)}`;
  const urlDescadastro = `${siteUrl}/descadastrar/${digest.descadastroToken}`;

  const blocosHtml = digest.avisos
    .map((a) => {
      const urlFonte = `https://www.doe.sp.gov.br/${a.slug}`;
      return `
      <div style="margin:0 0 20px 0;padding:14px 16px;border:1px solid #e3e1da;border-radius:10px;">
        <p style="margin:0 0 6px 0;font-size:16px;font-weight:bold;color:#1a2433;">${escaparHtml(humanizarTitulo(a.titulo))}</p>
        <p style="margin:0 0 8px 0;font-size:14px;color:#4a5261;line-height:1.5;">${destacarTermo(a.trecho, a.termo)}</p>
        <p style="margin:0;font-size:13px;color:#6d7482;">Você vigia: <strong>${escaparHtml(a.termo)}</strong> · <a href="${urlFonte}" style="color:#2456c9;">ver publicação na fonte</a></p>
      </div>`;
    })
    .join("\n");

  const excedenteHtml =
    digest.excedente > 0
      ? `<p style="font-size:14px;color:#4a5261;">E mais ${digest.excedente} ${digest.excedente === 1 ? "publicação" : "publicações"} no seu painel.</p>`
      : "";

  const html = `
  <div style="max-width:600px;margin:0 auto;font-family:system-ui,'Segoe UI',Roboto,sans-serif;background:#ffffff;color:#1a2433;padding:24px 16px;">
    <p style="font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#6d7482;margin:0 0 4px 0;">Edital Radar</p>
    <h1 style="font-size:20px;margin:0 0 20px 0;color:#1a2433;">O que saiu no Diário Oficial de SP em ${dataCurta(dataAlvo)}</h1>
    ${blocosHtml}
    ${excedenteHtml}
    <hr style="border:none;border-top:1px solid #e3e1da;margin:24px 0;" />
    <p style="font-size:12px;color:#6d7482;line-height:1.5;">${DISCLAIMER}</p>
    <p style="font-size:12px;color:#6d7482;"><a href="${urlDescadastro}" style="color:#6d7482;">Não quero mais receber estes avisos</a></p>
  </div>`;

  const blocosTexto = digest.avisos
    .map(
      (a) =>
        `• ${humanizarTitulo(a.titulo)}\n  ${a.trecho}\n  Você vigia: ${a.termo}\n  Fonte: https://www.doe.sp.gov.br/${a.slug}`,
    )
    .join("\n\n");
  const texto = [
    `O que saiu no Diário Oficial de SP em ${dataCurta(dataAlvo)}`,
    "",
    blocosTexto,
    digest.excedente > 0 ? `\nE mais ${digest.excedente} no seu painel.` : "",
    "",
    DISCLAIMER,
    `Descadastrar: ${urlDescadastro}`,
  ].join("\n");

  return { assunto, html, texto };
}
