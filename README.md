# Edital Radar

Alerta de oportunidades de fomento para ONGs/OSCs. O sistema lê o Diário
Oficial todo dia e avisa por e-mail quando sai edital/chamamento compatível
com o perfil da entidade (causa, região, prazo).

Produto em fases (um repo, uma marca):

1. **Watch** (free): alerta por palavra-chave no DOE-SP — 3 keywords, e-mail diário.
2. **Radar** (pago): perfil da ONG (causa + região) → match inteligente com resumo.
3. **Tradutor** (retenção): edital → checklist de prazo, documentos e elegibilidade.

Roadmap expandido (backoffice, SEO 2, feedback, WhatsApp, B2B federação,
outros estados): [`docs/base-de-conhecimentos/roadmap.md`](docs/base-de-conhecimentos/roadmap.md).

## Checklist de fundação (seção 8 do doc de ideias)

1. **Quem é a pessoa / job:** coordenador(a) de ONG pequena que não pode
   perder edital de fomento por não ter ninguém lendo o Diário Oficial.
2. **Fonte de dado do MVP:** API pública do DOE-SP
   (`do-api-web-search.doe.sp.gov.br/v2`) — **validada em 2026-08-12**, ver
   [`out/`](out/) e [`pipeline/validate-doe-sp.mjs`](pipeline/validate-doe-sp.mjs):
   - ~3.0–3.4 mil publicações/dia útil, zero em fim de semana (esperado);
   - busca por termo com contagem de ocorrências, sem autenticação;
   - texto completo em HTML por slug (3/3 amostras ok);
   - "chamamento público" rende 11–24 hits/dia útil — volume real de produto.
3. **Fora do v1:** outros estados, PNCP, app mobile, "gerar projeto com IA",
   qualquer classificação por LLM (v1 é regra determinística + keyword).
4. **Produto A, B ou módulo:** produto único em fases (Watch → Radar →
   Tradutor). Não é feature do state-sell.
5. **Risco nº 1:** atraso ou parse quebrado em edital com prazo curto →
   perda de confiança. Mitigação: SLA honesto na landing ("rodamos todo dia
   útil às 7h"), monitoração do job, e disclaimer fixo: *"não substitui a
   leitura oficial; sempre confira a publicação na fonte"*.
6. **Descoberta na 1ª semana:** SEO ("alerta diário oficial SP",
   "edital de fomento SP"), grupos de WhatsApp de OSC, federações e
   conselhos municipais (CONDECA, COMAS).

## Documentação

Padrões, invariantes e contratos vivem em
[`docs/base-de-conhecimentos/`](docs/base-de-conhecimentos/README.md) —
leitura obrigatória: `contexto-produto.md` e `regras-sistemicas-ia.md`.

## Estado atual

### Feito (código)
- [x] Fonte validada (DOE-SP API, 10 dias varridos, relatório em `out/`)
- [x] Fundação Astro 5 + tokens + schema Drizzle
- [x] Ingestão diária (cliente Zod + UPSERT por slug + `/api/coleta` + cron)
- [x] Motor de match por keyword + full-text + filtro de oportunidade aberta
- [x] Digest por e-mail (Resend dry-run) + descadastro + magic-link + painel
- [x] SEO `/temas` + `/municipios` + status público + onboarding de termos
- [x] SEO meta: OG/Twitter, canonical, noindex privado, JSON-LD, `/og.png`
- [x] Webhook Resend + alarme do job + backoffice `/admin`
- [x] Feedback "não era pra mim" + histórico no painel
- [x] Radar núcleo (perfil + prazo + resumo; admin promove)
- [x] Pasta salvos + conta compartilhada (equipe) + federação

### Agora — validar e reter (Stripe adiado)
- [ ] **Deploy produção** (Vercel + Postgres + domínio + envs + cron)
- [ ] **Resend real** + webhook Svix em produção + `ALARME_EMAIL`
- [x] Piloto ops (`/admin/piloto` + guia `piloto.md`) — executar com ONGs reais
- [x] Digest vazio 1×/semana + aviso de retificação
- [x] Tradutor 1ª fatia: checklist “Serve pra mim?”
- [x] Fila de feedbacks com classificação + mais fixtures rotulados

### Depois (quando houver demanda)
- [ ] Stripe (billing Radar) — ativação hoje é manual via admin
- [ ] Tradutor fatias seguintes (docs, timeline, leitura)
- [ ] WhatsApp digest / outros estados / PNCP (horizonte D)

Roadmap completo: [`docs/base-de-conhecimentos/roadmap.md`](docs/base-de-conhecimentos/roadmap.md).

## Rodar a validação

```bash
node pipeline/validate-doe-sp.mjs 10
```

Gera `out/validacao-doe-sp-<data>.json` com volume por dia, hits por termo,
seções mais frequentes e amostras.

## Observações da validação (2026-08-12)

- O resultado de busca mistura **edital aberto** com **extrato de dispensa /
  resultado de edital antigo**. O filtro `ehOportunidadeAberta` (título)
  bloqueia extrato/resultado/anulação/homologação nos **alertas**; as páginas
  SEO por tema continuam mostrando o que saiu no DOE.
- Seções mais férteis: Ciência/Tecnologia, Esportes, Desenvolvimento Social,
  Casa Civil — bom guia para as três causas do MVP.
- `hierarchy` e `publicationTypeId` vêm estruturados na API — dá para
  filtrar por seção sem NLP (fase Radar).
