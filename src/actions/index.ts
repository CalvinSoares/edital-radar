import { ActionError, defineAction, type ActionAPIContext } from "astro:actions";
import { z } from "astro:schema";
import { MensagemDeErro } from "../server/erros";
import { COOKIE_DE_SESSAO } from "../shared/sessao";
import {
  COOKIE_DE_ADMIN,
  adminAutenticado,
  adminConfigurado,
  opcoesDoCookieAdmin,
} from "../shared/admin";
import { COOKIE_DE_VISTA, idVistaAdmin, opcoesDoCookieVista } from "../shared/vista";
import { LIMITE_ASSUNTOS_POR_ASSINANTE } from "../server/match/perfil-catalogo";
import { permitirRateLimit } from "../server/seguranca/rate-limit";
import { igualComTempoConstante, tokenDoCookieAdmin } from "../server/seguranca/crypto-admin";

const LIMITE_ASSUNTOS = LIMITE_ASSUNTOS_POR_ASSINANTE;

// Imports tardios: o cliente do banco exige DATABASE_URL e não deve derrubar
// o dev/prerender das páginas públicas.
async function bancoERepositorios() {
  const { db } = await import("../server/db/cliente");
  return { db };
}

function ipDoPedido(context: ActionAPIContext): string {
  const xf = context.request.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]!.trim().slice(0, 64);
  return "local";
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

/** Bloqueia mutações enquanto o admin está em “ver como assinante”. */
async function exigirAssinanteEscrita(context: ActionAPIContext) {
  if (idVistaAdmin(context.cookies)) {
    throw new ActionError({ code: "FORBIDDEN", message: MensagemDeErro.VISTA_SOMENTE_LEITURA });
  }
  return exigirAssinante(context);
}

function exigirAdmin(context: ActionAPIContext) {
  if (!adminConfigurado()) {
    throw new ActionError({ code: "FORBIDDEN", message: MensagemDeErro.ADMIN_OFF });
  }
  if (!adminAutenticado(context.cookies)) {
    throw new ActionError({ code: "UNAUTHORIZED", message: MensagemDeErro.NAO_AUTORIZADO });
  }
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
      handler: async ({ email }, context) => {
        const ip = ipDoPedido(context);
        const emailNorm = email.trim().toLowerCase();
        if (
          !permitirRateLimit(`login:ip:${ip}`, { max: 10, janelaMs: 60_000 }) ||
          !permitirRateLimit(`login:email:${emailNorm}`, { max: 5, janelaMs: 60_000 })
        ) {
          throw new ActionError({ code: "TOO_MANY_REQUESTS", message: MensagemDeErro.RATE_LIMIT });
        }

        const { db } = await bancoERepositorios();
        const { obterOuCriarPorEmail, emailSuprimido } = await import(
          "../server/db/repositorios/assinantes"
        );
        const { criarLoginToken } = await import("../server/db/repositorios/auth");
        const { renderizarEmailDeLogin } = await import("../server/auth/render-login");
        const { criarClienteDeEmail } = await import("../server/alerta/resend");

        // Resposta idêntica se suprimido — não envia e-mail, não revela.
        if (await emailSuprimido(db, emailNorm)) {
          return { enviado: true };
        }

        const assinanteId = await obterOuCriarPorEmail(db, email);
        // Corrida: obterOuCriar pode devolver id de suprimido se criou antes do check.
        if (await emailSuprimido(db, emailNorm)) {
          return { enviado: true };
        }

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
          para: emailNorm,
          assunto: emailDeLogin.assunto,
          html: emailDeLogin.html,
          texto: emailDeLogin.texto,
          urlDescadastro: `${siteUrl}/entrar`,
        });
        return { enviado: true };
      },
    }),

    sair: defineAction({
      accept: "form",
      handler: async (_input, context) => {
        // Em vista admin, “Sair” no painel não deve revogar sessão do assinante.
        if (idVistaAdmin(context.cookies)) {
          context.cookies.delete(COOKIE_DE_VISTA, { path: "/" });
          return { saiu: true };
        }
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
          .max(80, "Pode ter no máximo 80 letras"),
      }),
      handler: async ({ termo }, context) => {
        const sessao = await exigirAssinanteEscrita(context);
        const { db } = await bancoERepositorios();
        const { listarDoAssinante, salvarKeyword } = await import(
          "../server/db/repositorios/keywords"
        );

        const atuais = await listarDoAssinante(db, sessao.assinanteId);
        if (atuais.length >= LIMITE_ASSUNTOS) {
          throw new ActionError({
            code: "FORBIDDEN",
            message: MensagemDeErro.LIMITE_DE_TERMOS,
          });
        }
        await salvarKeyword(db, sessao.assinanteId, termo);
        return { salvo: true };
      },
    }),

    remover: defineAction({
      accept: "form",
      input: z.object({ id: z.string().uuid() }),
      handler: async ({ id }, context) => {
        const sessao = await exigirAssinanteEscrita(context);
        const { db } = await bancoERepositorios();
        const { removerKeyword } = await import("../server/db/repositorios/keywords");
        await removerKeyword(db, sessao.assinanteId, id);
        return { removido: true };
      },
    }),
  },

  alerta: {
    marcarIrrelevante: defineAction({
      accept: "form",
      input: z.object({ id: z.string().uuid() }),
      handler: async ({ id }, context) => {
        const sessao = await exigirAssinanteEscrita(context);
        const { db } = await bancoERepositorios();
        const { marcarComoIrrelevante } = await import("../server/db/repositorios/alertas");
        const ok = await marcarComoIrrelevante(db, sessao.assinanteId, id);
        if (!ok) {
          throw new ActionError({ code: "NOT_FOUND", message: MensagemDeErro.AVISO_NAO_ENCONTRADO });
        }
        return { ok: true };
      },
    }),

    salvar: defineAction({
      accept: "form",
      input: z.object({ id: z.string().uuid() }),
      handler: async ({ id }, context) => {
        const sessao = await exigirAssinanteEscrita(context);
        const { db } = await bancoERepositorios();
        const { salvarPorAlerta } = await import("../server/db/repositorios/salvos");
        const ok = await salvarPorAlerta(db, sessao.assinanteId, id);
        if (!ok) {
          throw new ActionError({ code: "NOT_FOUND", message: MensagemDeErro.AVISO_NAO_ENCONTRADO });
        }
        return { ok: true };
      },
    }),
  },

  salvo: {
    remover: defineAction({
      accept: "form",
      input: z.object({ id: z.string().uuid() }),
      handler: async ({ id }, context) => {
        const sessao = await exigirAssinanteEscrita(context);
        const { db } = await bancoERepositorios();
        const { removerSalvo } = await import("../server/db/repositorios/salvos");
        await removerSalvo(db, sessao.assinanteId, id);
        return { ok: true };
      },
    }),
  },

  perfil: {
    salvar: defineAction({
      accept: "form",
      input: z.object({
        causas: z.union([z.string(), z.array(z.string())]).transform((v) => (Array.isArray(v) ? v : [v])),
        regioes: z.union([z.string(), z.array(z.string())]).transform((v) => (Array.isArray(v) ? v : [v])),
      }),
      handler: async ({ causas, regioes }, context) => {
        const sessao = await exigirAssinanteEscrita(context);
        if (causas.length === 0 || regioes.length === 0) {
          throw new ActionError({ code: "BAD_REQUEST", message: MensagemDeErro.PERFIL_INCOMPLETO });
        }
        const { db } = await bancoERepositorios();
        const { salvarPerfil } = await import("../server/db/repositorios/perfil");
        await salvarPerfil(db, sessao.assinanteId, { causas, regioes });
        return { ok: true };
      },
    }),
  },

  equipe: {
    convidar: defineAction({
      accept: "form",
      input: z.object({
        email: z.string().email(MensagemDeErro.EMAIL_INVALIDO),
        nome: z.string().trim().max(80).optional(),
      }),
      handler: async ({ email, nome }, context) => {
        const sessao = await exigirAssinanteEscrita(context);
        const { db } = await bancoERepositorios();
        const {
          garantirEquipeDoDono,
          obterEquipeDoAssinante,
          criarConviteEquipe,
        } = await import("../server/db/repositorios/equipe");
        const { criarClienteDeEmail } = await import("../server/alerta/resend");

        let eqp = await obterEquipeDoAssinante(db, sessao.assinanteId);
        if (!eqp) {
          const id = await garantirEquipeDoDono(db, sessao.assinanteId, nome || "Minha ONG");
          eqp = {
            equipeId: id,
            nome: nome || "Minha ONG",
            donoAssinanteId: sessao.assinanteId,
            papel: "dono",
          };
        }
        if (eqp.donoAssinanteId !== sessao.assinanteId) {
          throw new ActionError({ code: "FORBIDDEN", message: MensagemDeErro.SO_DONO });
        }

        let token: string;
        try {
          token = await criarConviteEquipe(db, {
            equipeId: eqp.equipeId,
            email,
            criadoPorAssinanteId: sessao.assinanteId,
          });
        } catch {
          throw new ActionError({ code: "FORBIDDEN", message: MensagemDeErro.LIMITE_EQUIPE });
        }

        const siteUrl = import.meta.env.SITE_URL ?? "http://localhost:4321";
        const url = `${siteUrl}/convite/equipe/${token}`;
        const cliente = criarClienteDeEmail({
          apiKey: import.meta.env.RESEND_API_KEY,
          modo: import.meta.env.RESEND_MODE,
          remetente: import.meta.env.EMAIL_REMETENTE ?? "Edital Radar <avisos@editalradar.com.br>",
          log: (m) => console.error(`[equipe] ${m}`),
        });
        await cliente.enviar({
          para: email.trim().toLowerCase(),
          assunto: `${sessao.email} te convidou para a equipe no Edital Radar`,
          html: `<p>Você foi convidado(a) a acompanhar os avisos da equipe.</p><p><a href="${url}">Aceitar convite</a></p><p>O link vale 7 dias.</p>`,
          texto: `Aceite o convite: ${url}`,
          urlDescadastro: `${siteUrl}/entrar`,
        });
        return { enviado: true };
      },
    }),

    removerMembro: defineAction({
      accept: "form",
      input: z.object({ assinanteId: z.string().uuid() }),
      handler: async ({ assinanteId }, context) => {
        const sessao = await exigirAssinanteEscrita(context);
        const { db } = await bancoERepositorios();
        const { obterEquipeDoAssinante, removerMembro } = await import(
          "../server/db/repositorios/equipe"
        );
        const eqp = await obterEquipeDoAssinante(db, sessao.assinanteId);
        if (!eqp || eqp.donoAssinanteId !== sessao.assinanteId) {
          throw new ActionError({ code: "FORBIDDEN", message: MensagemDeErro.SO_DONO });
        }
        await removerMembro(db, eqp.equipeId, assinanteId, sessao.assinanteId);
        return { ok: true };
      },
    }),
  },

  federacao: {
    convidar: defineAction({
      accept: "form",
      input: z.object({ email: z.string().email(MensagemDeErro.EMAIL_INVALIDO) }),
      handler: async ({ email }, context) => {
        const sessao = await exigirAssinanteEscrita(context);
        const { db } = await bancoERepositorios();
        const { obterFederacaoDoAdmin, criarConviteFederacao } = await import(
          "../server/db/repositorios/federacao"
        );
        const { criarClienteDeEmail } = await import("../server/alerta/resend");
        const fed = await obterFederacaoDoAdmin(db, sessao.assinanteId);
        if (!fed) {
          throw new ActionError({ code: "FORBIDDEN", message: MensagemDeErro.NAO_AUTORIZADO });
        }
        let token: string;
        try {
          token = await criarConviteFederacao(db, {
            federacaoId: fed.id,
            email,
            criadoPorAssinanteId: sessao.assinanteId,
          });
        } catch (e) {
          const msg = e instanceof Error && e.message === "SEM_ASSENTO"
            ? MensagemDeErro.SEM_ASSENTO
            : MensagemDeErro.NAO_AUTORIZADO;
          throw new ActionError({ code: "FORBIDDEN", message: msg });
        }
        const siteUrl = import.meta.env.SITE_URL ?? "http://localhost:4321";
        const url = `${siteUrl}/convite/federacao/${token}`;
        const cliente = criarClienteDeEmail({
          apiKey: import.meta.env.RESEND_API_KEY,
          modo: import.meta.env.RESEND_MODE,
          remetente: import.meta.env.EMAIL_REMETENTE ?? "Edital Radar <avisos@editalradar.com.br>",
          log: (m) => console.error(`[federacao] ${m}`),
        });
        await cliente.enviar({
          para: email.trim().toLowerCase(),
          assunto: `Convite ${fed.nome} — Edital Radar`,
          html: `<p>A rede <strong>${fed.nome}</strong> liberou um assento Radar para você.</p><p><a href="${url}">Ativar meu assento</a></p>`,
          texto: `Ative seu assento: ${url}`,
          urlDescadastro: `${siteUrl}/entrar`,
        });
        return { enviado: true };
      },
    }),
  },

  admin: {
    entrar: defineAction({
      accept: "form",
      input: z.object({
        senha: z.string().min(1, MensagemDeErro.ADMIN_SENHA_INVALIDA),
      }),
      handler: async ({ senha }, context) => {
        if (!adminConfigurado()) {
          throw new ActionError({ code: "FORBIDDEN", message: MensagemDeErro.ADMIN_OFF });
        }
        const ip = ipDoPedido(context);
        if (!permitirRateLimit(`admin:ip:${ip}`, { max: 8, janelaMs: 60_000 })) {
          throw new ActionError({ code: "TOO_MANY_REQUESTS", message: MensagemDeErro.RATE_LIMIT });
        }
        const secret = import.meta.env.ADMIN_SECRET!;
        if (!igualComTempoConstante(senha, secret)) {
          throw new ActionError({ code: "UNAUTHORIZED", message: MensagemDeErro.ADMIN_SENHA_INVALIDA });
        }
        context.cookies.set(COOKIE_DE_ADMIN, tokenDoCookieAdmin(secret), opcoesDoCookieAdmin());
        return { ok: true };
      },
    }),

    sair: defineAction({
      accept: "form",
      handler: async (_input, context) => {
        context.cookies.delete(COOKIE_DE_ADMIN, { path: "/" });
        context.cookies.delete(COOKIE_DE_VISTA, { path: "/" });
        return { saiu: true };
      },
    }),

    /** Abre o painel na visão do assinante (somente leitura). */
    verComo: defineAction({
      accept: "form",
      input: z.object({ id: z.string().uuid() }),
      handler: async ({ id }, context) => {
        exigirAdmin(context);
        const { db } = await bancoERepositorios();
        const { obterAssinanteParaVista } = await import("../server/db/repositorios/auth");
        const info = await obterAssinanteParaVista(db, id);
        if (!info) {
          throw new ActionError({ code: "NOT_FOUND", message: MensagemDeErro.AVISO_NAO_ENCONTRADO });
        }
        context.cookies.set(COOKIE_DE_VISTA, id, opcoesDoCookieVista());
        return { ok: true };
      },
    }),

    sairDaVista: defineAction({
      accept: "form",
      handler: async (_input, context) => {
        exigirAdmin(context);
        context.cookies.delete(COOKIE_DE_VISTA, { path: "/" });
        return { ok: true };
      },
    }),

    suprimir: defineAction({
      accept: "form",
      input: z.object({ id: z.string().uuid() }),
      handler: async ({ id }, context) => {
        exigirAdmin(context);
        const { db } = await bancoERepositorios();
        const { suprimirAssinanteAdmin } = await import("../server/db/repositorios/admin");
        await suprimirAssinanteAdmin(db, id);
        return { ok: true };
      },
    }),

    promoverRadar: defineAction({
      accept: "form",
      input: z.object({ id: z.string().uuid() }),
      handler: async ({ id }, context) => {
        exigirAdmin(context);
        const { db } = await bancoERepositorios();
        const { definirPlano } = await import("../server/db/repositorios/perfil");
        await definirPlano(db, id, "radar");
        return { ok: true };
      },
    }),

    criarFederacao: defineAction({
      accept: "form",
      input: z.object({
        nome: z.string().trim().min(2).max(120),
        adminEmail: z.string().email(MensagemDeErro.EMAIL_INVALIDO),
        assentos: z.coerce.number().int().min(1).max(500),
      }),
      handler: async ({ nome, adminEmail, assentos }, context) => {
        exigirAdmin(context);
        const { db } = await bancoERepositorios();
        const { obterOuCriarPorEmail } = await import("../server/db/repositorios/assinantes");
        const { criarFederacao } = await import("../server/db/repositorios/federacao");
        const adminId = await obterOuCriarPorEmail(db, adminEmail);
        await criarFederacao(db, { nome, adminAssinanteId: adminId, assentos });
        return { ok: true };
      },
    }),

    revisarFeedback: defineAction({
      accept: "form",
      input: z.object({
        id: z.string().uuid(),
        revisao: z.enum([
          "falso_positivo_filtro",
          "termo_ruim",
          "catalogo",
          "descartado",
        ]),
      }),
      handler: async ({ id, revisao }, context) => {
        exigirAdmin(context);
        const { db } = await bancoERepositorios();
        const { revisarFeedbackAdmin } = await import("../server/db/repositorios/admin");
        const ok = await revisarFeedbackAdmin(db, id, revisao);
        if (!ok) {
          throw new ActionError({ code: "NOT_FOUND", message: MensagemDeErro.AVISO_NAO_ENCONTRADO });
        }
        return { ok: true };
      },
    }),
  },

  tradutor: {
    salvarChecklist: defineAction({
      accept: "form",
      input: z
        .object({
          alertaId: z.string().uuid(),
        })
        .catchall(z.enum(["sim", "nao", "nao_sei"])),
      handler: async (input, context) => {
        const sessao = await exigirAssinanteEscrita(context);
        const { alertaId, ...resto } = input;
        const respostas: Record<string, "sim" | "nao" | "nao_sei"> = {};
        for (const [k, v] of Object.entries(resto)) {
          if (k.startsWith("r_") && (v === "sim" || v === "nao" || v === "nao_sei")) {
            respostas[k.slice(2)] = v;
          }
        }
        const { db } = await bancoERepositorios();
        const { salvarChecklist } = await import("../server/db/repositorios/tradutor");
        const ok = await salvarChecklist(db, sessao.assinanteId, alertaId, respostas);
        if (!ok) {
          throw new ActionError({ code: "NOT_FOUND", message: MensagemDeErro.AVISO_NAO_ENCONTRADO });
        }
        return { ok: true };
      },
    }),
  },
};
