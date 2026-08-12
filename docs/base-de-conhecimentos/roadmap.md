# Roadmap — Edital Radar

> Plano vivo de expansão. Um repo, uma marca (Watch → Radar → Tradutor).
> Prioridade sempre: **precisão e pontualidade** acima de feature nova.
> Atualizar quando uma fatia entrar no escopo ativo ou for descartada.

---

## Norte

A coordenadora de ONG pequena não quer "mais Diário Oficial". Quer
**saber a tempo**, **entender o que fazer**, e **não perder prazo**.
Cada item abaixo responde a um desses três.

**Decisão (2026-08-12):** Stripe **não** entra agora. Antes: colocar em
produção, validar precisão com gente real e reter quem já usa. Billing
só depois de haver demanda clara (e ativação Radar segue manual via admin).

---

## Já entregue (código)

### Watch
- Coleta diária DOE-SP + match full-text por keyword (≤3 termos free)
- Digest por e-mail + descadastro + magic-link + painel
- Filtro de oportunidade aberta + temas SEO `/temas` + municípios
- Bounce/reclamação → supressão; alarme do job; `/status`
- Feedback "não era pra mim" + histórico paginado + onboarding de termos
- Backoffice `/admin` (assinantes, coletas, feedbacks)

### Radar (sem cobrança online)
- Perfil causa + região, match, resumo, prazo
- Limite 10 termos; ativação `admin.promoverRadar`
- Pasta salvos, equipe (dono+2 + fan-out), federação (assentos)

**Gate operacional (bloqueia valor real):** deploy Vercel + Resend real +
webhook + `ALARME_EMAIL` + cron. Sem isso, o resto do roadmap não vale.

---

## Agora — Validar e reter (antes de Stripe / Tradutor)

Ordem prática. Não é “mais feature de produto pago”; é **confiança**.

| # | Item | Por quê | Tipo |
|---|---|---|---|
| 1 | **Deploy produção** | Usuário real | Ops |
| 2 | **Resend real + webhook** | E-mail e higiene de lista | Ops |
| 3 | **Cron + alarme** | SLA do job | Ops |
| 4 | **Convite piloto** (ONGs / federações) | ✔ | `/admin/piloto` + `piloto.md` |
| 5 | **Fila `/admin/feedbacks`** | ✔ | Classificar → fixture antes de mudar regra |
| 6 | **Mais rótulos** em `fixtures/rotulados/` | ✔ | oportunidade-aberta + retificacao |
| 7 | **Digest vazio 1×/semana** | ✔ | Sexta; tracking `digest_vazio_envio` |
| 8 | **Aviso de retificação** | ✔ | Só se nº/ano casa com alerta anterior |
| 9 | **Tradutor checklist** (1ª fatia) | ✔ | `/painel/tradutor/[alertaId]` |

Stripe continua **adiado** até retenção e demanda estarem claras.

---

## Horizonte A — Watch maduro (ainda free / pré-Radar)

| Item | Status | Notas |
|---|---|---|
| **Backoffice interno** | ✔ | `/admin` — resumo, assinantes, coletas, feedbacks, federações |
| **Feedback "isso não era pra mim"** | ✔ | Painel + `/admin/feedbacks` |
| **Aviso de retificação** | ✔ | Só vincula com nº/ano do edital já alertado |
| **SEO programático 2** | ✔ | Municípios + tema×município + sitemap + OG/canonical/JSON-LD |
| **Digest vazio explícito** | ✔ | Sexta-feira; 1×/semana por assinante |
| **Histórico no painel** | ✔ | Paginação + agrupamento por dia |
| **Status público do job** | ✔ | `/status` + badge na landing |
| **Onboarding de termos** | ✔ | Sugestões no painel |

---

## Horizonte B — Radar (pago)

| Item | Status | Notas |
|---|---|---|
| **Perfil da entidade** | ✔ | Causas + regiões de catálogo |
| **Match por perfil** | ✔ | Causa AND região + oportunidade aberta |
| **Resumo da oportunidade** | ✔ | Template |
| **Prazo extraído** | ✔ | Regex + trecho; vencido não alerta |
| **Limites maiores** | ⏸ piloto | Piloto grátis: sem teto de plano (só anti-abuso 50 assuntos) |
| **Ativação sem Stripe** | ✔ | Admin `→ Radar` — **modo atual** |
| **Pasta "salvei pra depois"** | ✔ | `/painel/salvos` |
| **Conta compartilhada** | ✔ | Equipe dono+2; fan-out |
| **Plano Federação / convite** | ✔ ops | Sem Stripe: só lote de acessos no admin (piloto B2B). Usuário comum não usa. |
| **Cobrança (Stripe)** | ⏸ adiado | Só após validar + reter; ver seção “Agora” |

---

## Horizonte C — Tradutor (retenção)

Depois que o alerta chegou: **o que fazer com o edital**.
Prioridade alta **depois** do gate de produção — é o caminho natural de
retenção sem depender de billing.

| Item | Status | Notas |
|---|---|---|
| **Checklist de elegibilidade** | ✔ 1ª fatia | `/painel/tradutor/[id]` — sim/não/não sei, sem LLM |
| **Lista de documentos** |  | Estatuto, CNPJ, certidões… por modalidade |
| **Linha do tempo** |  | Abertura → dúvidas → entrega; lembretes 7d / 48h |
| **Modo leitura do edital** |  | HTML limpo com âncoras (prazo, valor, público) |
| **Exportar checklist** |  | PDF/print pra diretoria — sem "gerar projeto com IA" |

---

## Horizonte D — Canais e cobertura (expansão de superfície)

Só depois de Radar estável em SP com gente usando.

| Item | Por quê | Cuidado |
|---|---|---|
| **WhatsApp (digest)** | A pessoa "vive no WhatsApp" | Opt-in; texto curto; compliance |
| **Outros estados (DOE)** | Mesmo job, outra fonte | Um estado por vez |
| **PNCP (fomento federal)** | Editais federais pra OSC | Não virar state-sell |
| **API read-only** | Federações / parceiros | Auth por chave; sem PII |
| **Relatório mensal** | Retenção Radar | PDF/e-mail |

---

## Backoffice (produto interno)

Já: resumo, assinantes (+ promover Radar / suprimir), coletas, feedbacks,
federações.

Ainda útil (não bloqueia piloto):

1. Reenviar magic-link manual
2. Amostra de alertas do dia + taxa de bounce
3. Ligar/desligar termo do catálogo SEO

---

## Melhorias técnicas contínuas

- Precisão do filtro `ehOportunidadeAberta` com mais rótulos reais
- Mapa `publicationTypeId` → tipo humano
- Idempotência / replay de dia no runbook
- Observabilidade além do e-mail de alarme
- Testes de contrato DOE quando a API mudar
- Cache CDN / ISR das páginas SEO se SSR pesar

---

## Explicitamente fora (até nova decisão)

- App mobile nativo
- "Gerar projeto / proposta com IA" como feature central
- Fundir com state-sell
- Marketplace de editais / lead gen pra consultoria
- Classificação 100% LLM sem conjunto rotulado
- **Stripe agora** (adiado conscientemente)

---

## Ordem sugerida de ataque

```
1. Deploy + Resend real + cron + alarme   ← ainda o gate de produção
2. Piloto com ONGs / federações           ← /admin/piloto (em curso)
3. Watch A restante ✔                     ← retificação + digest vazio
4. Tradutor 1ª fatia ✔                    ← checklist; próximas fatias depois
5. Stripe                                 ← só com demanda clara
6. WhatsApp / outros estados              ← superfície
```

Quando puxar um item pra sprint: abrir fatia em `changelog-local` e
atualizar contratos/schema **antes** de código grande.
