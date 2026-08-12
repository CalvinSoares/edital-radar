# Changelog Local

> Registro de mudanças relevantes (schema, contratos, regras, tokens).
> Mais recente primeiro.

---

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
