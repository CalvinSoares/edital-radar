# Contratos de API (Astro Actions + Endpoints)

> **Leituras** acontecem no frontmatter via repositórios (`src/server/db/repositorios/`).
> **Mutations** acontecem via Astro Actions (`src/actions/index.ts`), input Zod.
> **Endpoints** (`src/pages/api/`) só para o que não é página nem Action (cron, webhook).

**Estado (2026-08-12): implementado** — Actions em `src/actions/index.ts`,
sessão por cookie httpOnly (`er_sessao`, 30 dias), magic-link de uso único
(15 min). Repositórios de leitura em `src/server/db/repositorios/`.

---

## Convenções

- Actions nomeadas em **pt-BR**, agrupadas por domínio: `keyword.salvar`, `assinante.cadastrar`
- Toda Action: `input` Zod + `ActionError` com `MensagemDeErro` — nunca `throw new Error`
- Sucesso de form → redirect (POST-redirect-GET)
- Repositórios de leitura: paginação `{ pagina, porPagina }` (default 20, máx 100) → `{ itens, total }`
- Autenticação: sessão por cookie (magic-link); helper `exigirSessao(Astro)` nas páginas, `exigirSessaoAction(ctx)` nas Actions

---

## Leituras (repositórios) — fase Watch ✔

| Função | Contrato |
|---|---|
| `keywords.listarDoAssinante(db, assinanteId)` | → `{ id, termo, criadoEm }[]` |
| `alertas.listarDoAssinante(db, assinanteId, { pagina, porPagina })` | → `{ itens, total, pagina, porPagina }` — itens com `irrelevanteEm`; default 20, máx 50 |
| `coleta.ultimaColeta(db)` | → execução mais recente — alimenta "última leitura" |
| `auth.obterSessao(db, sessaoId)` | → `{ sessaoId, assinanteId, email, plano }` ou null (expirada/revogada) |

Helper de página: `obterSessaoAtiva(Astro.cookies)` em `src/shared/sessao.ts`
(shared porque toca tipo do Astro — `src/server/` fica livre de framework).

## Mutations (Actions) — fase Watch ✔

| Action | Contrato |
|---|---|
| `assinante.cadastrar` | `{ email }` → cria/reativa assinante + envia magic-link. Resposta idêntica exista ou não (nunca revelar). Descadastrado que volta é reativado; suprimido por bounce NÃO |
| `assinante.sair` | revoga sessão + apaga cookie |
| `keyword.salvar` | `{ termo (3–80) }` — free: máx 3 (`LIMITE_DE_TERMOS`); termo repetido é idempotente |
| `keyword.remover` | `{ id: uuid }` — escopada ao dono da sessão |
| `alerta.marcarIrrelevante` | `{ id: uuid }` — "isso não era pra mim"; idempotente; escopada ao dono; sai do digest pendente |

Fluxo magic-link (não é Action): `/entrar/[token]` (SSR) consome o token
(uso único atômico, 15 min), cria sessão, seta cookie e redireciona ao
painel. Token inválido/usado/expirado → **410** com CTA de pedir novo.

## Endpoints (`src/pages/api/`) — ✔ implementado

| Rota | Contrato |
|---|---|
| `GET/POST /api/coleta` | Auth: `Authorization: Bearer <COLETA_SECRET>` (cron da Vercel) ou header `x-coleta-secret` (manual). Query opcional `?data=YYYY-MM-DD` (default: hoje em SP). Idempotente. 401 sem/with secret errado (inclusive se env ausente); 200 com resumo da rodada; 500 quando `status === "erro"` (dispara alarme interno se `ALARME_EMAIL`) |
| `POST /api/resend-webhook` | Auth: assinatura Svix (`svix-id` / `svix-timestamp` / `svix-signature`) com `RESEND_WEBHOOK_SECRET`. Bounce **Permanent**, `email.complained`, `email.suppressed`, `suppression.added` → `suprimirPorEmails`. Soft bounce ignorado. 400 assinatura inválida; 503 secret ausente; 200 `{ ok, suprimidos }` |

## Backoffice interno (`/admin`) — ✔

Auth por cookie `er_admin` = `ADMIN_SECRET` (Action `admin.entrar`). Sem secret no env, login mostra "desligado".

| Rota | Conteúdo |
|---|---|
| `/admin/entrar` | Form de senha |
| `/admin` | Resumo: ativos / suprimidos / descadastrados / termos / alertas pendentes / feedbacks + última coleta |
| `/admin/assinantes` | Lista + busca por e-mail + termos + `admin.suprimir` |
| `/admin/coletas` | Últimas execuções do job |
| `/admin/feedbacks` | Fila de “não era pra mim” (título, termo, e-mail, fonte) |
| `/admin/federacoes` | Criar rede B2B (`admin.criarFederacao`: nome, adminEmail, assentos) |

Actions: `admin.entrar`, `admin.sair`, `admin.suprimir`, `admin.promoverRadar`,
`admin.criarFederacao`, `admin.revisarFeedback`, `admin.verComo`,
`admin.sairDaVista`. Bloqueado em `robots.txt`.

## Radar / retenção — Actions e rotas ✔ (Stripe adiado)

| Action / rota | Contrato |
|---|---|
| `perfil.salvar` | causas + regiões (plano `radar` ou `federacao`) |
| `alerta.salvar` | marca publicação do alerta na pasta (`salvo`) |
| `salvo.remover` | remove da pasta |
| `equipe.convidar` / `removerMembro` | dono convida ≤2; e-mail com `/convite/equipe/[token]` |
| `federacao.convidar` | admin da rede; `/convite/federacao/[token]` |
| `tradutor.salvarChecklist` | `alertaId` + `r_<item>` = sim\|nao\|nao_sei |
| `admin.revisarFeedback` | classifica feedback na fila |
| `/painel/salvos` · `/painel/equipe` · `/painel/federacao` | UI |
| `/painel/tradutor/[alertaId]` | checklist “Serve pra mim?” |
| `/admin/piloto` · `/admin/feedbacks` | ops de precisão/retenção |

Fan-out: ao criar alertas do dono, membros da equipe recebem cópia
(`listarMembrosParaFanOut` em `alertas.criarAlertas`).

Job: retificações via `criarAlertasDeRetificacao`; digest vazio na sexta
via `enviarDigestsVazios` (junto ao envio normal em `/api/coleta`).

---

## Regra de ouro

A UI **só** conversa com repositórios e Actions. Nunca chamar a API do DOE
do browser — dado sempre nasce no job e mora no banco.

---

## Checklist ao mudar contrato

- [ ] Zod do input atualizado
- [ ] Páginas/forms consumidores atualizados
- [ ] Este arquivo atualizado
- [ ] `changelog-local/alteracoes.md`
