# Changelog Local

> Registro de mudanças relevantes (schema, contratos, regras, tokens).
> Mais recente primeiro.

---

## 2026-08-12 — SEO meta: OG, canonical, noindex, JSON-LD

- `Base.astro`: canonical, robots, Open Graph + Twitter, `/og.png`
- `noindex` automático em painel/admin/entrar/convite/descadastro
- JSON-LD na home (Organization + WebSite) e listagens temas/municípios
- Docs SEO em `padrao-por-pagina.md`

## 2026-08-12 — Piloto grátis: sem limite de assuntos + copy

- Sem teto free/Radar de keywords (anti-abuso 50); perfil causa/região e
  equipe liberados pra todo mundo no piloto
- UI: “termos” → “o que você acompanha” / assuntos
- Federação: texto no admin — só lote B2B interno sem Stripe

## 2026-08-12 — Vista admin + hardening de segurança

- Admin **ver** no assinante → painel na visão dele (`er_vista`, 1h, só
  leitura; barra + sair da vista)
- Rate limit login (IP/e-mail) e admin entrar; cookie admin = HMAC (não
  secret cru); compare timing-safe (admin + coleta)
- Sessão ignora suprimido/descadastrado; magic-link não envia se bounce
- Equipe: vista admin não cria equipe ao abrir a página
- Doc: `docs/.../seguranca.md`

## 2026-08-12 — Acessibilidade + marca radar + cards sem faixa

- CTA ink+creme (AA); texto suave ~72%; gradiente de fundo único
- `BrandMark` SVG no header (remove “ER”); focus-visible / aria-current
- Cards com sombra “papel deslocado”, sem barra lateral

## 2026-08-12 — Paleta ColorHunt sea/clay + favicon

- Tokens: `#0F3040 / #464858 / #A56F63 / #D99B7F` (fundo peach `#F4EBE6`)
- Favicon + apple-touch (radar SVG); theme-color `#0F3040`
- Home com painel hero e anéis decorativos; mark ER do header mantido

## 2026-08-12 — Piloto, feedbacks, digest vazio, retificação, Tradutor 1

- Piloto: `/admin/piloto` + `docs/.../piloto.md` (precisão + retorno)
- Feedbacks: classificar (`falso_positivo_filtro` / termo / catálogo /
  descartado) → guia para fixture antes de mudar regra
- Fixtures: mais rótulos em `oportunidade-aberta.json` + `retificacao.json`;
  BLOQUEIOS ganha `republica`
- Digest vazio: sexta-feira, 1×/semana (`digest_vazio_envio`)
- Retificação: alerta `tipo=retificacao` só se nº/ano casa com alerta anterior
- Tradutor 1ª fatia: checklist “Serve pra mim?” em `/painel/tradutor/[id]`

## 2026-08-12 — Refino visual: ink + âmbar

- Nova paleta `#14213D` / `#FCA311` / `#E5E5E5` (substitui teal)
- Tipografia Syne + Plus Jakarta Sans; raio `rounded-sm`
- `SiteHeader` sticky com marca ER; cards `.er-card` com faixa âmbar
- CTA com tinta escura sobre âmbar (AA); docs em `tokens-design.md`

## 2026-08-12 — Docs: Stripe adiado; foco validar + reter

- Decisão: **não** aplicar Stripe agora — validar precisão e reter antes
- `roadmap.md`: seção “Agora — Validar e reter”; ordem de ataque revisada
  (deploy → piloto → Watch A → Tradutor → Stripe → canais)
- README checklist: salvos/equipe/federação ✔; próximos = ops + piloto +
  Tradutor; Stripe em “depois”
- Contratos: Actions Radar/equipe/federação; `contexto-produto` e
  `match-e-alertas` alinhados

## 2026-08-12 — Redesign visual (teal + carvão)

- Paleta ColorHunt `#222831 / #393E46 / #00ADB5 / #EEEEEE` nos tokens
  (`global.css` + `tokens-design.md`); dark mapeado para a mesma família
- Tipografia: Fraunces (display) + Figtree (body); fundo com radial teal
- Motion: `er-rise`, `er-radar-pulse`, `er-dot-live`, `er-lift` (+ reduced-motion)
- Home brand-first; copy mais falada em páginas públicas, painel e admin
- Componentes Button/Card/Field com focus ring e hover alinhados

## 2026-08-12 — Salvos, equipe compartilhada e federação

- Schema: `salvo`; `equipe` / `equipe_membro` / `equipe_convite`; `federacao` /
  `federacao_assento` / `federacao_convite`; plano `federacao`
- Pasta: salvar do histórico → `/painel/salvos`
- Equipe Radar: até 3 pessoas; convite por e-mail (`/convite/equipe/[token]`);
  fan-out de alertas do dono para membros
- Federação: admin cria em `/admin/federacoes`; admin da rede convida assentos
  em `/painel/federacao`; aceite em `/convite/federacao/[token]` → plano radar
- Stripe ainda pendente

## 2026-08-12 — Radar: perfil causa+região, prazo e resumo

- Schema: `perfil_radar` (causas/regiões JSONB); `alerta.origem/resumo/prazo_*`
- Catálogo fechado de causas e regiões; `casarPerfil` (causa AND região +
  oportunidade aberta); `extrairPrazo` + `resumirOportunidade` (template)
- Job: `listarPerfis` → match na mesma passada; prazo vencido não vira alerta
- Painel: formulário de perfil (plano Radar); avisos com resumo/prazo
- Admin: `→ Radar` (`promoverRadar`); limite de termos Radar = 10
- Billing Stripe ainda pendente — ativação manual via admin

## 2026-08-12 — Status público, onboarding e SEO 2

- `/status` — última leitura do DOE (SLA público); badge na landing
- Onboarding: sugestões de termos no painel (catálogo + causas) enquanto &lt; 3
- SEO: `/municipios`, `/municipios/[slug]`, `/temas/[tema]/[municipio]`;
  `[tema].astro` virou `[tema]/index.astro`; sitemap inclui municípios
- Roadmap A (exceto digest vazio) ✔

## 2026-08-12 — Feedback "não era pra mim" + histórico do painel

- Schema: `alerta.irrelevante_em` — feedback do assinante (idempotente)
- Action `alerta.marcarIrrelevante`; aviso marcado sai do digest pendente
- Painel: histórico paginado (`?pagina=`), agrupado por dia, botão de
  feedback; admin `/admin/feedbacks` + contador no resumo
- Roadmap A: feedback + histórico marcados ✔

## 2026-08-12 — Backoffice interno (/admin)

- Auth `ADMIN_SECRET` → cookie httpOnly `er_admin` (Actions `admin.entrar` /
  `sair` / `suprimir`)
- Páginas: `/admin` (resumo), `/admin/assinantes` (busca + termos +
  suprimir), `/admin/coletas` (execuções do job)
- Repositório `db/repositorios/admin.ts`; `robots.txt` bloqueia `/admin`
- Sem secret no env: login mostra "desligado". Roadmap A marcado ✔

## 2026-08-12 — Roadmap de expansão documentado

- Novo `docs/base-de-conhecimentos/roadmap.md`: horizontes A–D (Watch
  maduro, Radar, Tradutor, canais/cobertura) + backoffice interno +
  ordem de ataque + fora de escopo
- Itens novos no plano: feedback "não era pra mim", aviso de retificação,
  onboarding de termos, SEO por município/órgão, status público do job,
  pasta salvos, conta compartilhada, plano Federação, checklist/tradutor,
  WhatsApp opt-in, outros estados, PNCP filtrado, API read-only
- `contexto-produto.md` e README apontam para o roadmap; checklist ganhou
  backoffice interno como próximo após deploy

## 2026-08-12 — Watch: bounce, alarme do job, oportunidade aberta

- **Webhook Resend** `POST /api/resend-webhook`: verifica Svix (crypto
  nativo), suprime em bounce Permanent / complained / suppressed /
  suppression.added (`suprimirPorEmails`, permanente e idempotente). Soft
  bounce NÃO suprime. Env: `RESEND_WEBHOOK_SECRET`
- **Alarme do job**: `precisaAlarme` + `renderizarAlarme`; `rodarDia`
  notifica em todo `status=erro` (0 pubs em dia útil, falha de detalhe,
  provedor…). Destinatário `ALARME_EMAIL` (sem ele, só log + HTTP 500)
- **Filtro oportunidade aberta** (`ehOportunidadeAberta`): extrato /
  resultado / anulação / homologação / etc. não viram alerta de assinante;
  temas SEO **não** filtram. Fixtures em
  `fixtures/rotulados/oportunidade-aberta.json`
- README checklist atualizado (Watch de código fechado; falta só deploy +
  Resend real). Docs: match-e-alertas, coleta-e-jobs, api-contracts

## 2026-08-12 — Páginas SEO programáticas por tema

- Schema: `publicacao_tema` (UNIQUE publicacao+tema) — classificação
  persistida na mesma passada do match full-text, sem custo extra de API
- Catálogo fixo em `src/server/match/temas.ts` (5 temas: chamamento,
  fomento, colaboração, sociedade civil, credenciamento); termos revisados
  usam o mesmo motor dos assinantes
- Páginas: `/temas` (índice com contagem 30d) e `/temas/[slug]` (lista 15d
  agrupada por dia + CTA de cadastro); SSR + cache CDN 5min/1h
- Job: `casarDia` recebe temas → `temasCasados`; `rodarDia` persiste via
  `salvarTemas`; páginas SEO não dependem de assinante
- `sitemap.xml` + `robots.txt` (bloqueia painel/entrar/descadastro)
- Verificado com dados reais: 82 classificações (72 credenciamento, 5
  chamamento, 2 fomento, 2 colaboração, 1 sociedade-civil); slug inválido
  responde 404 (não rewrite — ForbiddenRewrite no Astro)
- 51 testes

## 2026-08-12 — Primeiro E2E real com banco provisionado ✅

- Postgres provisionado + `pnpm db:push` (7 tabelas criadas)
- Fluxo completo verificado com dados reais, tudo em dry-run de e-mail:
  cadastro → magic-link (2º clique no link = 410, uso único confirmado na
  prática) → sessão → termo "chamamento publico" → `POST /api/coleta` →
  **3.316 publicações ingeridas, 8 matches full-text, 6 alertas criados,
  1 digest** ("6 publicações com seus termos — DOE-SP, 12/08") → painel
  mostrando os 6 avisos e "Última leitura: 12/08 às 12:38"
- Observação: 8 matches → 6 alertas é a paginação do DOE se movendo durante
  a coleta (publicação repetida entre páginas) — o UNIQUE deduplicou como
  projetado
- Nota dev: o Vite recarrega o `.env` sozinho; scripts tsx precisam de
  `--env-file=.env` (helper `pipeline/ultimo-login-token.ts`)
- Pendente para produção: Vercel (deploy + envs + cron), Resend (API key +
  domínio verificado + RESEND_MODE=real), SITE_URL público

## 2026-08-12 — Magic-link, sessão e painel (primeiras Actions/páginas)

- Schema: `login_token` (uso único atômico, 15 min) e `sessao` (30 dias,
  cookie httpOnly `er_sessao`)
- Actions (`src/actions/index.ts`): `assinante.cadastrar` (cria/reativa +
  magic-link; resposta idêntica exista ou não), `assinante.sair`,
  `keyword.salvar` (free máx 3, idempotente), `keyword.remover` (escopada
  ao dono). Imports do banco tardios — dev sem DATABASE_URL não quebra
- Páginas: `/entrar` (form + PRG), `/entrar/[token]` (consome link, 410 se
  inválido), `/painel` (termos + avisos + última leitura + sair), landing
  ganhou CTA real
- Kit UI inicial em `src/components/ui/`: `Button`, `Field`, `Card`
- `src/shared/sessao.ts`: ponte cookies ↔ sessão (mantém `src/server/`
  livre de framework)
- Verificado no dev server: landing CTA, /entrar 200 com form, /painel 302
  → /entrar sem cookie, token inválido 410

## 2026-08-12 — Digest por e-mail + descadastro

- `src/server/alerta/`: `selecionarDigests` (pura — 1 e-mail/assinante, máx
  10 no corpo, excedente comunicado), `renderizarDigest` (pura — título
  humanizado, termo em strong, escape antes do destaque, disclaimer,
  descadastro), `enviarDigests` (`enviado_em` só após confirmação do
  provedor; falha isola por assinante), `criarClienteDeEmail` (Resend HTTP;
  `RESEND_MODE=real` só em produção; List-Unsubscribe)
- Schema: `assinante.descadastroToken` (uuid unique) + `descadastradoEm`;
  filtros de suprimido/descadastrado em keywords e pendentes
- Página `/descadastrar/[token]` (idempotente, 404 p/ token inválido —
  caminho verificado no dev server)
- `rodarDia` agora encadeia o envio (roda até em dia sem edição, para
  escoar pendentes de falha anterior); registro ganhou totais de envio
- Envs novas: `EMAIL_REMETENTE`, `SITE_URL`
- 50 testes; prévia visual do e-mail via `pipeline/gerar-digest-exemplo.ts`

## 2026-08-12 — Cobertura full-text + criação de alertas

- **Decisão revertida com medição**: a opção B (busca `Terms` da API) caiu —
  a API é sensível a acento ("chamamento publico" acha 1 vs 13 do acentuado).
  Implementada a opção A refinada: baixar o detalhe de TODAS as publicações
  do dia e casar localmente (motor insensível a acento)
- Prova: 13/13 vs gabarito da API em 11/08; custo medido ~25ms/detalhe →
  ~10s/dia com concorrência 8 (`pipeline/provar-fulltext.ts`)
- `casar-dia.ts` (match full-text, falha pontual não derruba o dia, >10% =
  erro), `concorrencia.ts` (mapComLimite), `rodar.ts` (orquestra ingestão →
  match → alertas → registro único)
- Schema: `publicacao.content/brutoDetalhe/contentEm` (persistidos SÓ para
  quem casou — ajuste consciente do invariante do bruto);
  `alerta.campo/trecho` (rastreabilidade do e-mail)
- Repositórios novos: `keywords.listarKeywordsParaMatch` (exclui suprimidos),
  `alertas.criarAlertas` (dedup pelo UNIQUE), `publicacoes.salvarConteudos`
- `/api/coleta` e CLI agora rodam a rodada completa; `maxDuration: 300`
- 40 testes no total

## 2026-08-12 — Motor de match por keyword

- `src/server/match/`: `casarKeywords` (pura) + `normalizarPreservandoIndices`
  (baixa caixa e tira acento SEM mudar o comprimento — índice do match vale
  no texto original, de onde sai o trecho do e-mail)
- Regras: fronteira de palavra, acento/caixa-insensível, espaços flexíveis,
  prioridade título > excerpt > content, termo < 3 letras ignorado
- 8 casos rotulados em `fixtures/rotulados/match-keywords.json` (2 reais);
  29 testes no total
- Provado em dado real (`pipeline/provar-match.ts`): 3.315 publicações de
  12/08, 14 matches com trecho legível
- **Decisão pendente registrada**: match título+excerpt subconta vs.
  full-text da API (~9 × 11–24/dia) — resolver antes do digest
  (recomendação: busca `Terms` por termo único + detalhe dos hits)

## 2026-08-12 — Job de coleta implementado

- `src/server/coleta/`: cliente DOE (retry + Zod na borda), normalização
  (`parseDataDoe` estrito, offset -03:00 fixo), calendário
  (`decidirStatus`: 0 em dia útil = erro; 0 em fim de semana = sem_edicao),
  ingestão paginada com deps injetadas
- Repositórios: `upsertPublicacoes` (UPSERT por slug) e `registrarExecucao`/
  `ultimaColeta`
- `GET/POST /api/coleta` (Bearer do cron da Vercel ou `x-coleta-secret`) +
  `vercel.json` com cron `30 9 * * 1-5` UTC (6h30 SP)
- CLI `pnpm coleta:rodar -- [--data=…] [--dry-run]`
- 14 testes (vitest) incluindo fixture real da API travando o contrato;
  dry-run completo de 2026-08-12: 3.314 publicações, 34 páginas, zero quebra
- Pendências da fase Watch: match por keyword, seleção/digest, magic-link

## 2026-08-12 — Troca de casca: Next → Astro

- Decisão: **Astro 5** no lugar de Next. Motivo: fase Watch tem casca fina e
  a distribuição é SEO (páginas públicas programáticas com ~zero JS) — o
  cenário ideal do Astro. Preço aceito: Actions/auth manual no lugar dos
  reflexos tRPC do state-sell
- Reescritos: `arquitetura/visao-geral.md`, `frontend/padrao-por-pagina.md`,
  `frontend/componentizacao.md`, `frontend/estados-de-tela.md`,
  `frontend/padrao-erros-usuario.md`, `backend/api-contracts.md`
- Novos princípios: leitura via repositório no frontmatter; mutation via
  Action (form + POST-redirect-GET); estado de filtro na URL; `.astro` por
  padrão e ilha React só com estado real no client; `src/server/` proibido
  de importar `astro:*` (núcleo portátil)
- Deploy continua Vercel (`@astrojs/vercel`); cron chama `POST /api/coleta`

## 2026-08-12 — Fundação

- Fonte DOE-SP validada por chamadas reais (`pipeline/validate-doe-sp.mjs`,
  10 dias): API pública sem auth, busca por termo, texto completo ok.
  Números em `backend/fonte-doe-sp.md`
- Base de conhecimentos criada (padrão president/state-sell): contexto,
  regras sistêmicas, tokens, padrão por página, componentização, estados de
  tela, erros, contratos tRPC, coleta e match
- Decisões de produto registradas: um repo/uma marca (Watch = plano free do
  Radar); v1 só SP; sem LLM no v1; tokens pt-BR com semântica de prazo
- Nenhum código de app ainda — próximo passo: fundação Next + schema Drizzle
  + job de coleta (fase Watch)
