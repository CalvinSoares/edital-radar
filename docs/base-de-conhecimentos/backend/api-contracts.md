# Contratos de API (tRPC)

> Routers em `src/server/api/routers/`. Types fluem pelo tRPC — sem arquivo
> de tipos manual. Input **sempre** validado com Zod no procedure.

⚠️ **Estado: contratos planejados** — nenhum router implementado ainda.
Ao implementar, atualizar este arquivo com o contrato real e remover o ⚠️.

---

## Convenções

- Nomes de router e procedure em **pt-BR**, verbo no infinitivo: `keyword.salvar`, `alerta.listar`
- Paginação: `pagina` (1-based) + `porPagina` (default 20, máx 100); resposta `{ itens, total }`
- Strings vazias viram `undefined` no client antes de enviar
- Erros: `TRPCError` + `MensagemDeErro` (ver `frontend/padrao-erros-usuario.md`)
- Procedures autenticados via middleware de sessão (magic-link); público só o necessário para landing/cadastro

---

## Routers planejados (fase Watch)

### `assinante`

| Procedure | Tipo | Contrato |
|---|---|---|
| `cadastrar` | public mutation | `{ email }` → envia magic-link. Nunca revelar se o e-mail já existe |
| `entrar` | public mutation | `{ token }` → sessão |
| `me` | auth query | dados do assinante + plano |

### `keyword`

| Procedure | Tipo | Contrato |
|---|---|---|
| `listar` | auth query | `{}` → `{ itens: { id, termo, criadoEm }[] }` |
| `salvar` | auth mutation | `{ termo: string (3–80 chars) }` — free: máx 3 (`LIMITE_DE_TERMOS`) |
| `remover` | auth mutation | `{ id }` |

### `alerta`

| Procedure | Tipo | Contrato |
|---|---|---|
| `listar` | auth query | `{ pagina?, porPagina? }` → `{ itens, total }`. Item: `{ id, titulo, trecho, urlFonte, dataPublicacao, termoQueBateu, enviadoEm }` |
| `detalhe` | auth query | `{ id }` → item + conteúdo completo |

### `coleta` (interno)

| Procedure | Tipo | Contrato |
|---|---|---|
| `rodar` | protegido por secret (header) | dispara ingestão do dia — idempotente. Chamado pelo cron, não pela UI |

---

## Regra de ouro

A UI **só** conversa com esses routers. Nunca chamar a API do DOE do
browser — dado sempre nasce no job e mora no banco.

---

## Checklist ao mudar contrato

- [ ] Zod do input atualizado
- [ ] Pages consumidoras atualizadas
- [ ] Este arquivo atualizado
- [ ] `changelog-local/alteracoes.md`
