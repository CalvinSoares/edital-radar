# Contratos de API (Astro Actions + Endpoints)

> **Leituras** acontecem no frontmatter via repositórios (`src/server/db/repositorios/`).
> **Mutations** acontecem via Astro Actions (`src/actions/index.ts`), input Zod.
> **Endpoints** (`src/pages/api/`) só para o que não é página nem Action (cron, webhook).

⚠️ **Estado: contratos planejados** — nada implementado ainda.
Ao implementar, atualizar este arquivo com o contrato real e remover o ⚠️.

---

## Convenções

- Actions nomeadas em **pt-BR**, agrupadas por domínio: `keyword.salvar`, `assinante.cadastrar`
- Toda Action: `input` Zod + `ActionError` com `MensagemDeErro` — nunca `throw new Error`
- Sucesso de form → redirect (POST-redirect-GET)
- Repositórios de leitura: paginação `{ pagina, porPagina }` (default 20, máx 100) → `{ itens, total }`
- Autenticação: sessão por cookie (magic-link); helper `exigirSessao(Astro)` nas páginas, `exigirSessaoAction(ctx)` nas Actions

---

## Leituras (repositórios) — fase Watch

| Função | Contrato |
|---|---|
| `listarKeywords(assinanteId)` | → `{ id, termo, criadoEm }[]` |
| `listarAvisos({ assinanteId, pagina, porPagina })` | → `{ itens, total }`. Item: `{ id, titulo, trecho, urlFonte, dataPublicacao, termoQueBateu, enviadoEm }` |
| `detalheAviso({ assinanteId, id })` | → item + conteúdo completo, ou `null` (página faz 404) |
| `ultimaColeta()` | → `{ dataAlvo, status, executadoEm }` — alimenta "última leitura: hoje, 7h04" |

## Mutations (Actions) — fase Watch

| Action | Contrato |
|---|---|
| `assinante.cadastrar` | `{ email }` → envia magic-link. Nunca revelar se o e-mail já existe |
| `assinante.sair` | `{}` → encerra sessão |
| `keyword.salvar` | `{ termo: string (3–80) }` — free: máx 3 (`LIMITE_DE_TERMOS`) |
| `keyword.remover` | `{ id }` |

Login por magic-link: o link do e-mail aponta para página SSR
(`/entrar/[token]`) que valida, cria sessão e redireciona — não é Action.

## Endpoints (`src/pages/api/`)

| Rota | Contrato |
|---|---|
| `POST /api/coleta` | Header de secret (env). Dispara ingestão do dia — idempotente. Chamado pelo cron da Vercel, nunca pela UI. 401 sem secret; 200 com resumo `{ coletados, casados, enviados }` |

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
