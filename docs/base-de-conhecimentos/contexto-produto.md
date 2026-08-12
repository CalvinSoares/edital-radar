# Contexto do Produto — Edital Radar

> ⭐ Leitura obrigatória antes de qualquer tarefa.

---

## O produto em uma frase

O Edital Radar lê o Diário Oficial todo dia e avisa por e-mail a ONG/OSC
quando sai edital, chamamento ou fomento compatível com ela — para que a
oportunidade nunca passe batido.

## Quem é a pessoa

Coordenador(a) de ONG pequena (assistência, cultura, esporte, educação,
meio ambiente). Não tem procurador nem funcionário lendo o DOE. Vive no
WhatsApp e no e-mail. Não conhece — e não precisa conhecer — os termos
"chamamento público", "termo de fomento", "MROSC".

**Teste de tela:** leia em voz alta imaginando essa pessoa ouvindo. Se ela
pararia para perguntar o que uma palavra significa, a tela está errada.

## Fases (um repo, uma marca)

| Fase | Nome | O que entrega | Plano |
|---|---|---|---|
| 1 | **Watch** | Alerta por palavra-chave no DOE-SP (3 keywords, e-mail diário) | Free |
| 2 | **Radar** | Perfil da entidade (causa + região) → match inteligente + resumo | Pago |
| 3 | **Tradutor** | Edital → checklist de prazo, documentos, elegibilidade | Retenção |

O Watch **não** é produto separado: é o plano free do Radar. Não criar
segunda marca/domínio/landing.

Expansão detalhada (backoffice, SEO 2, WhatsApp, B2B federação, outros
estados, melhorias técnicas): ver **`roadmap.md`**.

**Estado (2026-08-12):** Watch + Radar (sem Stripe) estão no código.
Próximo foco: **produção + validar precisão + reter** (Tradutor). Cobrança
online só depois — ativação Radar hoje é manual no admin.

## O que fica explicitamente fora do v1 (Watch)

- Outros estados (só SP)
- PNCP como fonte (roadmap D; o state-sell já cobre PNCP para outro público)
- App mobile
- "Gerar projeto com IA"
- Classificação por LLM sem meta de precisão medida
- Qualquer processamento de pagamento (entra no Radar)
- Backoffice público / self-service admin para terceiros

## Fonte de dados (validada em 2026-08-12)

API pública do DOE-SP — ver `backend/fonte-doe-sp.md`. ~3,0–3,4 mil
publicações/dia útil; "chamamento público" rende 11–24 hits/dia útil.

## Relação com outros projetos da pasta

| Projeto | Relação |
|---|---|
| **state-sell** (Prefeitura Quer) | Mesmo músculo (coleta + match + cron + e-mail + magic-link), **outro cliente** (MEI que vende ≠ ONG que capta). Não fundir; reusar padrões, não código colado |
| **president** (Plenavis) | Origem do padrão desta base de conhecimentos |

## Risco nº 1 e disclaimer

Atraso ou parse quebrado em edital com prazo curto → perda de confiança →
churn. Mitigação: SLA honesto ("rodamos todo dia útil às 7h"), monitoração
do job, e disclaimer fixo em todo alerta:

> *"O Edital Radar não substitui a leitura oficial. Sempre confira a
> publicação na fonte antes de agir."*

## Como alguém descobre o produto

SEO ("alerta diário oficial SP", "edital de fomento SP"), grupos de WhatsApp
de OSC, federações e conselhos (CONDECA, COMAS), indicação entre ONGs.

Canal futuro no próprio produto: digest WhatsApp (opt-in) — ver roadmap D.
