import { ActionError, defineAction, type ActionAPIContext } from "astro:actions";
import { z } from "astro:schema";
import { MensagemDeErro } from "../server/erros";
import { COOKIE_DE_SESSAO } from "../shared/sessao";

const LIMITE_FREE_DE_TERMOS = 3;

// Imports tardios: o cliente do banco exige DATABASE_URL e não deve derrubar
// o dev/prerender das páginas públicas.
async function bancoERepositorios() {
  const { db } = await import("../server/db/cliente");
  return { db };
}

async function exigirAssinante(context: ActionAPIContext) {
  const sessaoId = context.cookies.get(COOKIE_DE_SESSAO)?.value;
  if (sessaoId && /^[0-9a-f-]{36}$/.test(sessaoId)) {
    const { db } = await bancoERepositorios();
    const { obterSessao } = await import("../server/db/repositorios/auth");
    const sessao = await obterSessao(db, sessaoId);
    if (sessao) return sessao;
  }
  throw new ActionError({ code: "UNAUTHORIZED", message: MensagemDeErro.NAO_AUTORIZADO });
}

export const server = {
  assinante: {
    // Cadastro e login são o mesmo gesto — a resposta é idêntica exista o
    // e-mail ou não (nunca revelar).
    cadastrar: defineAction({
      accept: "form",
      input: z.object({
        email: z.string().email(MensagemDeErro.EMAIL_INVALIDO),
      }),
      handler: async ({ email }) => {
        const { db } = await bancoERepositorios();
        const { obterOuCriarPorEmail } = await import("../server/db/repositorios/assinantes");
        const { criarLoginToken } = await import("../server/db/repositorios/auth");
        const { renderizarEmailDeLogin } = await import("../server/auth/render-login");
        const { criarClienteDeEmail } = await import("../server/alerta/resend");

        const assinanteId = await obterOuCriarPorEmail(db, email);
        const token = await criarLoginToken(db, assinanteId);
        const siteUrl = import.meta.env.SITE_URL ?? "http://localhost:4321";
        const urlDeEntrada = `${siteUrl}/entrar/${token}`;

        const emailDeLogin = renderizarEmailDeLogin(urlDeEntrada);
        const cliente = criarClienteDeEmail({
          apiKey: import.meta.env.RESEND_API_KEY,
          modo: import.meta.env.RESEND_MODE,
          remetente: import.meta.env.EMAIL_REMETENTE ?? "Edital Radar <avisos@editalradar.com.br>",
          log: (m) => console.error(`[login] ${m}`),
        });
        await cliente.enviar({
          para: email.trim().toLowerCase(),
          assunto: emailDeLogin.assunto,
          html: emailDeLogin.html,
          texto: emailDeLogin.texto,
          urlDescadastro: `${siteUrl}/entrar`, // login não é marketing; sem descadastro real
        });
        return { enviado: true };
      },
    }),

    sair: defineAction({
      accept: "form",
      handler: async (_input, context) => {
        const sessao = await exigirAssinante(context);
        const { db } = await bancoERepositorios();
        const { revogarSessao } = await import("../server/db/repositorios/auth");
        await revogarSessao(db, sessao.sessaoId);
        context.cookies.delete(COOKIE_DE_SESSAO, { path: "/" });
        return { saiu: true };
      },
    }),
  },

  keyword: {
    salvar: defineAction({
      accept: "form",
      input: z.object({
        termo: z
          .string({ message: MensagemDeErro.TERMO_OBRIGATORIO })
          .trim()
          .min(3, MensagemDeErro.TERMO_MUITO_CURTO)
          .max(80, "O termo pode ter no máximo 80 letras"),
      }),
      handler: async ({ termo }, context) => {
        const sessao = await exigirAssinante(context);
        const { db } = await bancoERepositorios();
        const { listarDoAssinante, salvarKeyword } = await import(
          "../server/db/repositorios/keywords"
        );

        const atuais = await listarDoAssinante(db, sessao.assinanteId);
        if (sessao.plano === "free" && atuais.length >= LIMITE_FREE_DE_TERMOS) {
          throw new ActionError({ code: "FORBIDDEN", message: MensagemDeErro.LIMITE_DE_TERMOS });
        }
        await salvarKeyword(db, sessao.assinanteId, termo);
        return { salvo: true };
      },
    }),

    remover: defineAction({
      accept: "form",
      input: z.object({ id: z.string().uuid() }),
      handler: async ({ id }, context) => {
        const sessao = await exigirAssinante(context);
        const { db } = await bancoERepositorios();
        const { removerKeyword } = await import("../server/db/repositorios/keywords");
        await removerKeyword(db, sessao.assinanteId, id);
        return { removido: true };
      },
    }),
  },
};
