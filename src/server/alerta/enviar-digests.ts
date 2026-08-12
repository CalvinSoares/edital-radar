// Orquestra o envio dos digests: pendentes → seleção (pura) → render (puro)
// → provedor → marcar enviados. `enviado_em` só é gravado DEPOIS do retorno
// de sucesso do provedor; falha em um assinante não derruba os demais.

import { selecionarDigests, type AlertaPendente } from "./selecionar";
import { renderizarDigest } from "./render";
import type { ClienteDeEmail } from "./resend";

export type ResumoDoEnvio = {
  emails: number;
  alertasEnviados: number;
  falhas: number;
};

export type DepsDoEnvio = {
  listarPendentes: () => Promise<AlertaPendente[]>;
  marcarEnviados: (alertaIds: string[]) => Promise<void>;
  cliente: ClienteDeEmail;
  dataAlvo: string;
  siteUrl: string;
  log?: (m: string) => void;
};

export async function enviarDigests(deps: DepsDoEnvio): Promise<ResumoDoEnvio> {
  const { listarPendentes, marcarEnviados, cliente, dataAlvo, siteUrl, log = () => {} } = deps;

  const pendentes = await listarPendentes();
  const digests = selecionarDigests(pendentes);

  let emails = 0;
  let alertasEnviados = 0;
  let falhas = 0;

  for (const digest of digests) {
    try {
      const email = renderizarDigest(digest, dataAlvo, siteUrl);
      await cliente.enviar({
        para: digest.email,
        assunto: email.assunto,
        html: email.html,
        texto: email.texto,
        urlDescadastro: `${siteUrl}/descadastrar/${digest.descadastroToken}`,
      });
      // Só marca depois do provedor confirmar — nunca antes.
      await marcarEnviados(digest.alertaIds);
      emails += 1;
      alertasEnviados += digest.alertaIds.length;
    } catch (e) {
      falhas += 1;
      log(`envio falhou para assinante ${digest.assinanteId}: ${e instanceof Error ? e.message : e}`);
    }
  }

  return { emails, alertasEnviados, falhas };
}
