# Changelog Local

> Registro de mudanças relevantes (schema, contratos, regras, tokens).
> Mais recente primeiro.

---

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
