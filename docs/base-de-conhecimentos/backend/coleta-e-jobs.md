# Coleta e Jobs

> Job diário de ingestão do DOE-SP: contrato de confiabilidade do produto.

**Estado (2026-08-12):** fluxo completo (ingestão → match → alertas → temas
SEO → digests → registro → alarme) **implementado**.

---

## Fluxo do job diário

```
cron (dia útil, ~6h30 America/Sao_Paulo)      → vercel.json: 30 9 * * 1-5 (UTC)
  └─ 1. Buscar publicações do dia (paginado, PageSize=100)   ✔ cliente-doe.ts
     2. Validar cada página com Zod ── falhou? → falha alto   ✔ (schema no cliente)
     3. Gravar bruto + normalizado (UPSERT por slug)          ✔ ingerir.ts + repositório
     4. Match FULL-TEXT (baixa detalhe de tudo, casa local)   ✔ casar-dia.ts (~10s p/ 3,3k)
        · keywords de assinantes → alerta (filtro oportunidade aberta)
        · catálogo de temas → publicacao_tema (SEO)
     5. Criar alertas (dedup por UNIQUE, campo + trecho)      ✔ repositorios/alertas.ts
     6. Enviar digests (1 e-mail/assinante, máx 10 no corpo)  ✔ alerta/enviar-digests.ts
     7. Registrar execução em coleta_execucao                 ✔ rodar.ts — uma vez, com totais
     8. Se status=erro → alarme (log + e-mail ALARME_EMAIL)   ✔ coleta/alarme.ts
```

O envio (6) roda até em dia sem edição: alerta que falhou no envio de ontem
continua pendente e sai no próximo ciclo. `enviado_em` só é gravado após o
provedor confirmar. Bounce/reclamação → `/api/resend-webhook` ✔.

Orquestração: `src/server/coleta/rodar.ts` (`rodarDia`) encadeia 1→8 com
deps injetadas. Endpoint e CLI só montam as deps reais.

## Arquivos

| Arquivo | Papel |
|---|---|
| `src/server/coleta/cliente-doe.ts` | Fetch + retry/backoff + Zod na borda (`PaginaDeBuscaSchema`) |
| `src/server/coleta/normalizar.ts` | Item → row; `parseDataDoe` (formato estrito, offset -03:00) |
| `src/server/coleta/calendario.ts` | `hojeEmSaoPaulo`, `ehFimDeSemana`, `decidirStatus` |
| `src/server/coleta/ingerir.ts` | Orquestração paginada; deps injetadas (testável sem banco) |
| `src/server/coleta/casar-dia.ts` | Match full-text + temas |
| `src/server/coleta/alarme.ts` | `precisaAlarme` / `renderizarAlarme` (puro) |
| `src/server/coleta/rodar.ts` | Orquestra a rodada completa |
| `src/pages/api/coleta.ts` | Endpoint do cron (Bearer/`x-coleta-secret`); import tardio do db |
| `src/pages/api/resend-webhook.ts` | Bounce/reclamação → supressão (Svix) |
| `scripts/coleta-rodar.ts` | CLI: `pnpm coleta:rodar -- --data=YYYY-MM-DD [--dry-run]` |
| `fixtures/doe/pagina-busca-*.json` | Resposta real da API — trava o contrato no teste |

## Invariantes do job

- **Idempotente**: rodar duas vezes no mesmo dia não duplica nada
  (UPSERT por `slug`; alerta com `UNIQUE (assinante_id, publicacao_id)`)
- **Bruto sempre gravado** — reprocessar match nunca exige re-consulta
- **0 publicações em dia útil = alarme** (a API pode ter mudado);
  0 no fim de semana = normal (`sem_edicao`)
- Retry com backoff em falha de rede; falha persistente → notificação
  interna (`ALARME_EMAIL` + log), nunca silêncio
- Execução registrada em tabela própria (`coleta_execucao`) — é ela que
  alimenta o "Última leitura: hoje, 7h04" da UI

## SLA público

A landing promete: **"lemos o Diário todo dia útil às 7h"**. Todo desvio
(atraso, falha, DOE fora do ar) precisa ficar visível internamente no mesmo
dia. Silêncio parece normal — e é assim que produto de alerta morre.

`decidirStatus` já marca dia útil com 0 pubs como `erro`; `rodarDia` chama
`notificarAlarme` sempre que `status === "erro"` (também falha de detalhe
>10%, falha de envio, etc.). Sem `ALARME_EMAIL`, o alarme fica só no log
do cron (Vercel captura o HTTP 500).

## Schema mínimo (fase Watch)

| Tabela | Campos-chave |
|---|---|
| `publicacao` | `slug UNIQUE`, `titulo`, `excerpt`, `data_publicacao`, `hierarchy`, `publication_type_id`, `bruto jsonb`, `coletado_em` |
| `publicacao_tema` | `publicacao_id`, `tema`, UNIQUE `(publicacao_id, tema)` |
| `assinante` | `email UNIQUE`, `plano`, `suprimido_em`, `descadastrado_em` |
| `keyword` | `assinante_id`, `termo`, UNIQUE `(assinante_id, termo)` |
| `alerta` | `assinante_id`, `publicacao_id`, `keyword_id`, `enviado_em`, UNIQUE `(assinante_id, publicacao_id)` |
| `coleta_execucao` | `data_alvo`, `status`, `total_coletado`, `total_enviado`, `erro` |

Valores monetários (quando existirem, fase Radar): centavos em `bigint`.

## Ambientes

- E-mail real **só em produção** (modo por env, mesmo padrão `RESEND_MODE`
  do state-sell)
- Cron em produção via `vercel.json` (ou equivalente); local via script
  `pnpm coleta:rodar -- --data=YYYY-MM-DD`
- Secret do endpoint de coleta em env — nunca no código
- Webhook Resend: `RESEND_WEBHOOK_SECRET` (Svix `whsec_…`)

## Referências

- `fonte-doe-sp.md` — contrato da API
- `../regras-de-negocio/match-e-alertas.md` — o que acontece após coletar
