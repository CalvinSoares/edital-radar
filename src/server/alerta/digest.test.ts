import { describe, expect, it } from "vitest";
import { selecionarDigests, type AlertaPendente } from "./selecionar";
import { destacarTermo, humanizarTitulo, renderizarDigest } from "./render";
import { enviarDigests } from "./enviar-digests";
import type { MensagemDeEmail } from "./resend";

function pendente(sobrescrever: Partial<AlertaPendente> = {}): AlertaPendente {
  return {
    alertaId: "al-1",
    assinanteId: "as-1",
    email: "ong@exemplo.org",
    descadastroToken: "11111111-1111-1111-1111-111111111111",
    termo: "chamamento público",
    titulo: "EDITAL DE CHAMAMENTO PÚBLICO Nº 14/2026",
    trecho: "…fica aberto o Chamamento Público para projetos de cultura…",
    slug: "executivo/secretaria/edital-14",
    dataPublicacao: new Date("2026-08-12T04:00:00Z"),
    ...sobrescrever,
  };
}

describe("selecionarDigests", () => {
  it("um digest por assinante, mais recente primeiro", () => {
    const digests = selecionarDigests([
      pendente({ alertaId: "a1", assinanteId: "as-1", dataPublicacao: new Date("2026-08-11T04:00:00Z") }),
      pendente({ alertaId: "a2", assinanteId: "as-2" }),
      pendente({ alertaId: "a3", assinanteId: "as-1", dataPublicacao: new Date("2026-08-12T04:00:00Z") }),
    ]);
    expect(digests).toHaveLength(2);
    const doAs1 = digests.find((d) => d.assinanteId === "as-1")!;
    expect(doAs1.avisos.map((a) => a.alertaId)).toEqual(["a3", "a1"]);
  });

  it("acima de 10 avisos vira excedente, mas todos os ids são comunicados", () => {
    const muitos = Array.from({ length: 13 }, (_, i) =>
      pendente({ alertaId: `a${i}`, assinanteId: "as-1" }),
    );
    const [digest] = selecionarDigests(muitos);
    expect(digest!.avisos).toHaveLength(10);
    expect(digest!.excedente).toBe(3);
    expect(digest!.alertaIds).toHaveLength(13);
  });
});

describe("render", () => {
  it("humaniza título em caixa alta e preserva título já legível", () => {
    expect(humanizarTitulo("EDITAL DE CHAMAMENTO PÚBLICO")).toBe("Edital de chamamento público");
    expect(humanizarTitulo("Portaria nº 97, de 6 de agosto")).toBe("Portaria nº 97, de 6 de agosto");
  });

  it("destaca o termo (sem acento acha com acento) e escapa HTML", () => {
    const html = destacarTermo("Edital <urgente> de Chamamento Público aberto", "chamamento publico");
    expect(html).toContain("<strong>Chamamento Público</strong>");
    expect(html).toContain("&lt;urgente&gt;");
  });

  it("digest completo: assunto com contagem total, fonte, disclaimer e descadastro", () => {
    const [digest] = selecionarDigests([
      pendente(),
      pendente({ alertaId: "a2", titulo: "EXTRATO DE TERMO DE FOMENTO" }),
    ]);
    const email = renderizarDigest(digest!, "2026-08-12", "https://editalradar.com.br");

    expect(email.assunto).toBe("2 publicações com seus termos — Diário Oficial de SP, 12/08");
    expect(email.html).toContain("https://www.doe.sp.gov.br/executivo/secretaria/edital-14");
    expect(email.html).toContain("Você vigia:");
    expect(email.html).toContain("não substitui a leitura oficial");
    expect(email.html).toContain("/descadastrar/11111111-1111-1111-1111-111111111111");
    expect(email.texto).toContain("Descadastrar:");
  });

  it("excedente aparece no corpo e soma no assunto", () => {
    const muitos = Array.from({ length: 12 }, (_, i) => pendente({ alertaId: `a${i}` }));
    const [digest] = selecionarDigests(muitos);
    const email = renderizarDigest(digest!, "2026-08-12", "https://editalradar.com.br");
    expect(email.assunto).toContain("12 publicações");
    expect(email.html).toContain("E mais 2 publicações no seu painel");
  });
});

describe("enviarDigests", () => {
  it("marca enviados SÓ depois do provedor confirmar; falha não derruba os demais", async () => {
    const marcados: string[][] = [];
    const enviados: MensagemDeEmail[] = [];

    const resumo = await enviarDigests({
      listarPendentes: async () => [
        pendente({ assinanteId: "as-ok", alertaId: "a1", email: "ok@ong.org" }),
        pendente({ assinanteId: "as-falha", alertaId: "a2", email: "falha@ong.org" }),
      ],
      marcarEnviados: async (ids) => void marcados.push(ids),
      cliente: {
        enviar: async (msg) => {
          if (msg.para === "falha@ong.org") throw new Error("Resend respondeu HTTP 500");
          enviados.push(msg);
          return { id: "email-1" };
        },
      },
      dataAlvo: "2026-08-12",
      siteUrl: "https://editalradar.com.br",
    });

    expect(resumo).toEqual({ emails: 1, alertasEnviados: 1, falhas: 1 });
    expect(marcados).toEqual([["a1"]]); // o alerta do envio que falhou continua pendente
    expect(enviados[0]!.urlDescadastro).toContain("/descadastrar/");
  });

  it("sem pendentes: nenhum e-mail, nenhum erro", async () => {
    const resumo = await enviarDigests({
      listarPendentes: async () => [],
      marcarEnviados: async () => {
        throw new Error("não deveria ser chamado");
      },
      cliente: {
        enviar: async () => {
          throw new Error("não deveria ser chamado");
        },
      },
      dataAlvo: "2026-08-12",
      siteUrl: "https://editalradar.com.br",
    });
    expect(resumo).toEqual({ emails: 0, alertasEnviados: 0, falhas: 0 });
  });
});
