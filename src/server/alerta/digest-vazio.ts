// Digest semanal quando não saiu nada com os termos do assinante.
// Só em sexta (diaDaSemana === 5). Tracking por semana ISO — sem inventar alerta.

import { diaDaSemana } from "../coleta/calendario";
import type { ClienteDeEmail } from "./resend";
import type { EmailRenderizado } from "./render";

export type AssinanteParaDigestVazio = {
  assinanteId: string;
  email: string;
  descadastroToken: string;
};

export type DepsDoDigestVazio = {
  /** True só em sexta-feira (America/Sao_Paulo dataAlvo). */
  listarCandidatos: () => Promise<AssinanteParaDigestVazio[]>;
  registrarEnvio: (assinanteId: string, semanaIso: string) => Promise<void>;
  cliente: ClienteDeEmail;
  dataAlvo: string;
  siteUrl: string;
  log?: (m: string) => void;
};

export function semanaIsoDe(dataAlvo: string): string {
  const [ano, mes, dia] = dataAlvo.split("-").map(Number);
  const d = new Date(Date.UTC(ano!, mes! - 1, dia!));
  // ISO week: Thursday-based
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function deveEnviarDigestVazioHoje(dataAlvo: string): boolean {
  return diaDaSemana(dataAlvo) === 5; // sexta
}

export function renderizarDigestVazio(
  dataAlvo: string,
  siteUrl: string,
  descadastroToken: string,
): EmailRenderizado {
  const [, mes, dia] = dataAlvo.split("-");
  const dataCurta = `${dia}/${mes}`;
  const urlPainel = `${siteUrl}/painel`;
  const urlDescadastro = `${siteUrl}/descadastrar/${descadastroToken}`;
  const assunto = `Nada do que você acompanha nesta semana — Diário Oficial de SP`;
  const html = `
  <div style="max-width:600px;margin:0 auto;font-family:system-ui,'Segoe UI',Roboto,sans-serif;background:#ffffff;color:#1a2433;padding:24px 16px;">
    <p style="font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#6d7482;margin:0 0 4px 0;">Edital Radar</p>
    <h1 style="font-size:20px;margin:0 0 12px 0;">Nesta semana não saiu nada do que você acompanha</h1>
    <p style="font-size:14px;color:#4a5261;line-height:1.5;">
      Continuamos lendo o Diário Oficial de SP todo dia útil. Se aparecer algo,
      avisamos no mesmo dia. Você pode revisar o que acompanha no
      <a href="${urlPainel}" style="color:#2456c9;">painel</a>.
    </p>
    <p style="font-size:12px;color:#6d7482;margin-top:24px;">Cheque enviado em ${dataCurta} · 1 vez por semana.</p>
    <p style="font-size:12px;color:#6d7482;"><a href="${urlDescadastro}" style="color:#6d7482;">Não quero mais receber estes avisos</a></p>
  </div>`;
  const texto = [
    "Nesta semana não saiu nada do que você acompanha.",
    `Painel: ${urlPainel}`,
    `Descadastrar: ${urlDescadastro}`,
  ].join("\n");
  return { assunto, html, texto };
}

export async function enviarDigestsVazios(
  deps: DepsDoDigestVazio,
): Promise<{ emails: number; falhas: number }> {
  const { dataAlvo, cliente, siteUrl, log = () => {} } = deps;
  if (!deveEnviarDigestVazioHoje(dataAlvo)) return { emails: 0, falhas: 0 };

  const semana = semanaIsoDe(dataAlvo);
  const candidatos = await deps.listarCandidatos();
  let emails = 0;
  let falhas = 0;

  for (const a of candidatos) {
    try {
      const email = renderizarDigestVazio(dataAlvo, siteUrl, a.descadastroToken);
      await cliente.enviar({
        para: a.email,
        assunto: email.assunto,
        html: email.html,
        texto: email.texto,
        urlDescadastro: `${siteUrl}/descadastrar/${a.descadastroToken}`,
      });
      await deps.registrarEnvio(a.assinanteId, semana);
      emails += 1;
    } catch (e) {
      falhas += 1;
      log(`digest vazio falhou para ${a.assinanteId}: ${e instanceof Error ? e.message : e}`);
    }
  }
  return { emails, falhas };
}
