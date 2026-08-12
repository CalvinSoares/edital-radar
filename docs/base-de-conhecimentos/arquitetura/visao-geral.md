# Arquitetura — Visão Geral

> Camadas e fluxo de dados do Edital Radar.

---

## Stack

| Camada | Tecnologia | Igual ao state-sell? |
|---|---|---|
| Framework | Next 15 (App Router) + React 19 | ✔ |
| API | tRPC 11 | ✔ |
| Banco | Postgres + Drizzle | ✔ |
| Validação | Zod | ✔ |
| Estilo | Tailwind v4 (`@theme` + tokens pt-BR) | ✔ (tokens próprios) |
| Testes | Vitest | ✔ |
| E-mail | Resend (modo por env) | ✔ |
| Deploy | Vercel + cron | ✔ |
| Pacotes | pnpm | ✔ |

Decisão consciente: mesma stack do state-sell para reusar **padrões e
reflexos**, não código colado.

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
UI (Next) ◄──── tRPC ◄──── banco local  ◄─────┘
```

Regras de ouro:

- UI **nunca** chama a API do DOE — só o banco via tRPC
- Job **nunca** renderiza React
- Match **nunca** faz I/O

---

## Estrutura de pastas (alvo)

```
src/
├── app/                    # rotas Next (page.tsx só compõe)
│   └── (rota)/_components | hook | utils
├── shared/
│   ├── components/         # ui.tsx (kit) + compartilhados
│   ├── hook/  utils/  schema/  config/
├── server/
│   ├── api/routers/        # tRPC (assinante, keyword, alerta, coleta)
│   ├── api/erros.ts        # MensagemDeErro
│   ├── coleta/             # cliente DOE + ingestão (I/O)
│   ├── match/              # regras puras
│   ├── alerta/             # seleção + envio
│   └── db/                 # schema Drizzle + repositórios
├── fixtures/               # publicações reais rotuladas
└── pipeline/               # scripts de validação/exploração (fora do app)
```

---

## Ciclo de vida diário

| Hora (SP) | Evento |
|---|---|
| ~01h | DOE publica a edição do dia |
| 06h30 | Cron: coleta + match + seleção |
| ~07h | Envio dos digests |
| dia todo | UI lê do banco; painel mostra "última leitura" |

Fim de semana: sem edição, sem e-mail (estado esperado, ver
`frontend/estados-de-tela.md`).
