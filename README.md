# Edital Radar

Alerta de oportunidades de fomento para ONGs/OSCs. O sistema lê o Diário
Oficial todo dia e avisa por e-mail quando sai edital/chamamento compatível
com o perfil da entidade (causa, região, prazo).

Produto em fases (um repo, uma marca):

1. **Watch** (free): alerta por palavra-chave no DOE-SP — 3 keywords, e-mail diário.
2. **Radar** (pago): perfil da ONG (causa + região) → match inteligente com resumo.
3. **Tradutor** (retenção): edital → checklist de prazo, documentos e elegibilidade.

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

## Estado atual

- [x] Fonte validada (DOE-SP API, 10 dias varridos, relatório em `out/`)
- [ ] Ingestão diária persistida (schema `Publicacao`)
- [ ] Match por keyword + e-mail (fase Watch)
- [ ] Perfil de entidade + match por causa/região (fase Radar)

## Rodar a validação

```bash
node pipeline/validate-doe-sp.mjs 10
```

Gera `out/validacao-doe-sp-<data>.json` com volume por dia, hits por termo,
seções mais frequentes e amostras.

## Observações da validação (2026-08-12)

- O resultado de busca mistura **edital aberto** com **extrato de dispensa /
  resultado de edital antigo**. Separar "oportunidade aberta" de "burocracia
  sobre edital passado" é o core do motor de match (tipo de publicação +
  seção + regex de prazo).
- Seções mais férteis: Ciência/Tecnologia, Esportes, Desenvolvimento Social,
  Casa Civil — bom guia para as três causas do MVP.
- `hierarchy` e `publicationTypeId` vêm estruturados na API — dá para
  filtrar por seção sem NLP.
