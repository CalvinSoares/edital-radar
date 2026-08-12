# Match e Alertas

> Da publicação coletada ao e-mail na caixa da ONG.

⚠️ **Estado: planejado** (fase Watch). Atualizar ao implementar.

---

## Fase Watch — match por keyword

- Match **case-insensitive e sem sensibilidade a acento** ("credito" acha "crédito")
- Termo bate em `titulo` OU `excerpt` OU `content` (quando disponível)
- A função de match é **pura** (`src/server/match/`): entrada publicação +
  keywords, saída lista de pares — sem I/O, sem Date, sem env
- Regra nova só entra com exemplo em `fixtures/` (publicação real rotulada)

## Seleção (o que vira e-mail)

1. Dedup: `UNIQUE (assinante_id, publicacao_id)` no banco — nunca em memória
2. Limite por assinante por dia: **10 no e-mail** (acima disso, agrupar:
   "e mais N publicações no seu painel")
3. Assinante suprimido (bounce/reclamação) nunca recebe
4. Free: máx 3 keywords; excedente bloqueado no cadastro, não na seleção

## O e-mail

Um e-mail diário por assinante (digest), nunca um por publicação:

```
Assunto: 3 publicações com seus termos — Diário Oficial de SP, 12/08

Para cada aviso:
  • Título humanizado (sem caixa alta do DOE)
  • Trecho onde o termo apareceu (termo destacado)
  • "Você vigia: <termo>"          ← rastreabilidade
  • Link para a publicação na fonte (doe.sp.gov.br/{slug})

Rodapé fixo:
  • Disclaimer: "O Edital Radar não substitui a leitura oficial…"
  • Link de descadastro em 1 clique (obrigatório)
```

Sem PDF anexo. Sem promessa de resultado. Sem jargão no assunto.

## Fase Radar (pago) — match por perfil ⚠️ futuro

- Perfil: causas (catálogo fechado, estilo catálogo de ramos do state-sell)
  + regiões
- Filtro de **tipo**: só publicação que é *oportunidade aberta*
  (`publicationTypeId` + seção + regex de prazo) — extrato de dispensa e
  resultado de edital antigo **não** geram alerta
- Prazo extraído sempre acompanhado do trecho original que o sustenta
- Nunca alertar oportunidade com prazo já encerrado; com menos de 48h,
  destacar urgência

## Métricas de qualidade

- Conjunto rotulado em `fixtures/rotulados/` (publicação → é/não é
  oportunidade para o perfil X)
- Precisão no conjunto rotulado trava o CI quando cair abaixo da meta
  (meta inicial: 0,95, herdada do state-sell)
- Feedback no e-mail/painel: "isso não era pra mim" alimenta os rótulos
