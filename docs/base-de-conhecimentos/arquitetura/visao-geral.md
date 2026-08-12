# Arquitetura — Visão Geral

> Camadas e fluxo de dados do Edital Radar.

---

## Stack

| Camada | Tecnologia | Observação |
|---|---|---|
| Framework | **Astro 5** (SSR + prerender) | Escolhido pelo SEO-first: páginas públicas programáticas com ~zero JS |
| Interatividade | Ilhas React (`@astrojs/react`) | Só onde há estado no client — o padrão é `.astro` puro |
| Mutations | **Astro Actions** (Zod embutido) | Substitui o tRPC do padrão state-sell |
| Banco | Postgres + Drizzle | Igual state-sell |
| Validação | Zod | Igual state-sell |
| Estilo | Tailwind v4 (`@theme` + tokens pt-BR) | Igual state-sell (tokens próprios) |
| Testes | Vitest | Igual state-sell |
| E-mail | Resend (modo por env) | Igual state-sell |
| Deploy | Vercel (`@astrojs/vercel`) + cron | Cron chama `/api/coleta` com secret |
| Pacotes | pnpm | Igual state-sell |

Decisão consciente (2026-08-12): Astro no lugar de Next porque a fase Watch
tem casca fina (landing + cadastro + painel pequeno) e a distribuição é SEO —
páginas públicas diárias indexáveis. O preço aceito: Actions/auth manual no
lugar dos reflexos tRPC do state-sell.

---

## Fluxo de dados

```
API DOE-SP ──(job diário, Zod na borda)──► Postgres (bruto + normalizado)
                                              │
                              match puro (src/server/match/)
                                              │
                                    seleção + dedup (UNIQUE)
                                              │
                             Resend ──► e-mail digest do assinante
                                              │
UI (Astro) ◄── frontmatter/Actions ◄── banco local ◄──┘
```

Regras de ouro:

- Browser **nunca** chama a API do DOE — dado nasce no job e mora no banco
- Página lê via **repositório** no frontmatter; muta via **Action**
- Job **nunca** importa nada de `astro:*`
- Match **nunca** faz I/O

---

## Estrutura de pastas (alvo)

```
src/
├── pages/                  # rotas .astro + endpoints (/api/coleta.ts)
├── layouts/                # Base.astro
├── components/
│   ├── ui/                 # kit .astro (Button, Card, Field…)
│   └── (feature)/          # componentes da feature; ilhas .tsx só se interativo
├── actions/                # Astro Actions (mutations, Zod, ActionError)
├── server/                 # ★ núcleo portátil — NÃO importa astro:*
│   ├── coleta/             # cliente DOE + ingestão (I/O)
│   ├── match/              # regras puras
│   ├── alerta/             # seleção + envio
│   ├── db/                 # schema Drizzle + repositórios
│   └── erros.ts            # MensagemDeErro
├── styles/global.css       # tokens (:root + @theme)
fixtures/                   # publicações reais rotuladas
pipeline/                   # scripts de validação/exploração (fora do app)
```

`src/server/` é deliberadamente independente de framework: se um dia a casca
mudar (de volta a Next, ou outra), o núcleo migra intacto.

---

## Renderização por tipo de página

| Página | Modo |
|---|---|
| Landing | `prerender = true` (estático na CDN) |
| Páginas SEO (`/temas`) | SSR + `Cache-Control` (lista muda todo dia útil; CDN cacheia 1h) |
| Painel, cadastro, magic-link | SSR (serverless) |
| `/api/coleta` | Endpoint SSR protegido por secret (cron) |

---

## Ciclo de vida diário

| Hora (SP) | Evento |
|---|---|
| ~01h | DOE publica a edição do dia |
| 06h30 | Cron Vercel → `POST /api/coleta`: coleta + match + seleção |
| ~07h | Envio dos digests |
| dia todo | UI lê do banco; painel mostra "última leitura" |

Fim de semana: sem edição, sem e-mail (estado esperado, ver
`frontend/estados-de-tela.md`).
