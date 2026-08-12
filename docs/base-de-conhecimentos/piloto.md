# Piloto — ONGs e federações

> Operação para validar precisão e retenção **antes** de Stripe.
> Métricas ao vivo: `/admin/piloto`.

---

## Objetivo

Em 2–4 semanas com 5–15 entidades:

1. **Precisão** — poucos “não era pra mim”; falsos positivos viram fixture.
2. **Retorno** — a pessoa abre o painel de novo (proxy: sessão em 7 dias).
3. **Retenção pós-alerta** — usa “Serve pra mim?” pelo menos uma vez.

## Como convidar

1. Peça o e-mail da coordenadora → ela entra em `/entrar` (magic-link).
2. No admin → Assinantes → **→ Radar** se for testar perfil causa/região.
3. Federação: `/admin/federacoes` cria a rede; o admin convida assentos em
   `/painel/federacao`.
4. Oriente: cadastrar 1–3 termos reais (nome da ONG, bairro, causa).

## Ritual semanal (sexta)

| Passo | Onde |
|---|---|
| Olhar “voltaram em 7d” | `/admin/piloto` |
| Esvaziar fila de feedbacks | `/admin/feedbacks` — classificar cada item |
| Falso positivo | `fixtures/rotulados/` + teste → só então mudar regra |
| Digest vazio | Job já envia 1×/semana (sexta) se não houve alerta em 7d |

## O que contar como sucesso

- Taxa de retorno (sessão/ativos) estável ou subindo
- Feedbacks pendentes &lt; crescimento de alertas
- Pelo menos metade do piloto abriu um checklist “Serve pra mim?”

## Fora do piloto

Deploy/Resend real ainda são gate de produção. Sem e-mail real, o piloto
só valida painel + match local.
