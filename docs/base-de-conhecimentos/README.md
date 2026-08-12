# Base de Conhecimentos — Edital Radar

> Documentação viva do Edital Radar (alerta de fomento para ONGs/OSCs).
> Atualizar conforme evoluem funcionalidades, contratos, tokens e padrões.

---

## Princípio Fundamental

> **"A UI lê só do banco local. O job diário puxa o DOE-SP, valida com Zod e
> grava o bruto. Alerta atrasado ou falso mata a confiança — precisão e
> pontualidade acima de features. Zero jargão de Diário Oficial em texto
> visível. Stack: Astro 5 (SSR + prerender) + Actions + Drizzle/Postgres +
> Tailwind v4 — núcleo em `src/server/` independente de framework."**

---

## Estrutura

```
base-de-conhecimentos/
├── README.md                          ← este arquivo
│
├── contexto-produto.md                ← ⭐ LEITURA OBRIGATÓRIA — produto, fases, usuário
├── regras-sistemicas-ia.md            ← ⭐ LEITURA OBRIGATÓRIA — invariantes, metodologia
│
├── arquitetura/
│   └── visao-geral.md                 → Camadas, fluxo de dados, stack
│
├── frontend/
│   ├── tokens-design.md               → CSS vars, Tailwind v4 @theme, tipografia
│   ├── padrao-por-pagina.md           → Estrutura obrigatória por página (Astro)
│   ├── componentizacao.md             → .astro por padrão, quando virar ilha React
│   ├── estados-de-tela.md             → Empty / error (SSR: loading é exceção)
│   └── padrao-erros-usuario.md        → ActionError → form/tela, copy de erro
│
├── backend/
│   ├── api-contracts.md               → Repositórios, Astro Actions e endpoints
│   ├── fonte-doe-sp.md                → API do DOE-SP: endpoints, campos, armadilhas
│   └── coleta-e-jobs.md               → Job diário, idempotência, cron, SLA
│
├── regras-de-negocio/
│   └── match-e-alertas.md             → Keywords, dedup, seleção e envio
│
└── changelog-local/
    └── alteracoes.md                  → Registro de mudanças relevantes
```

---

## Por Onde Começar

| Precisa de... | Vá para... |
|---|---|
| Entender o produto | `contexto-produto.md` |
| Invariantes / metodologia | `regras-sistemicas-ia.md` |
| Criar uma nova page | `frontend/padrao-por-pagina.md` |
| Tokens / cores / fontes | `frontend/tokens-design.md` |
| Tratar loading/erro/vazio | `frontend/estados-de-tela.md` + `frontend/padrao-erros-usuario.md` |
| Contrato de API | `backend/api-contracts.md` |
| Campos e limites do DOE-SP | `backend/fonte-doe-sp.md` |
| Job de coleta | `backend/coleta-e-jobs.md` |
| Match / envio de alerta | `regras-de-negocio/match-e-alertas.md` |
| Registrar mudança | `changelog-local/alteracoes.md` |

---

## Regra de Atualização

Atualizar esta base **sempre que** uma mudança impactar:

| Área | Arquivo |
|---|---|
| Tokens / tema | `frontend/tokens-design.md` |
| Nova rota / listagem | `frontend/padrao-por-pagina.md` |
| Repositório / Action / endpoint | `backend/api-contracts.md` |
| Campo novo consumido do DOE | `backend/fonte-doe-sp.md` |
| Job / cron / SLA | `backend/coleta-e-jobs.md` |
| Regra de match ou envio | `regras-de-negocio/match-e-alertas.md` |
| Schema Drizzle | arquitetura + regras de negócio afetadas |
| Qualquer coisa relevante | `changelog-local/alteracoes.md` |

---

*Criada em: 12/08/2026 — junto com a validação da fonte (`pipeline/validate-doe-sp.mjs`).*
