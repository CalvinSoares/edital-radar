# Match e Alertas

> Da publicação coletada ao e-mail na caixa da ONG.

**Estado (2026-08-12):** motor de match **implementado** (`src/server/match/`),
29 testes + 8 casos rotulados. Seleção, digest e envio ⚠️ planejados.

---

## Fase Watch — match por keyword ✔

- Match **case-insensitive e sem sensibilidade a acento** ("credito" acha
  "Crédito"; "licitacao" acha "LICITAÇÃO" — cedilha via NFD)
- **Fronteira de palavra**: "arte" NÃO casa "parte" — precisão > cobertura
- Espaços no termo casam qualquer sequência de espaço/quebra no texto
- Termo bate em `titulo` OU `excerpt` OU `content` (prioridade nessa ordem;
  para no primeiro campo que casar)
- Termo com menos de 3 letras é ignorado (ruído)
- O `trecho` devolvido vem do texto **original** (legível, com reticências) —
  a normalização preserva índices (`normalizarPreservandoIndices`)
- A função de match é **pura** (`casarKeywords`): entrada publicação +
  keywords, saída lista de pares — sem I/O, sem Date, sem env
- Regra nova só entra com caso em `fixtures/rotulados/match-keywords.json`

### Cobertura full-text — DECIDIDA e implementada (2026-08-12)

O match roda sobre o **texto completo** de toda publicação do dia
(`casarDia` em `src/server/coleta/casar-dia.ts`):

- **Por que não usar a busca `Terms` da API** (era a recomendação B):
  medição provou que ela é **sensível a acento** — "chamamento público" = 13
  hits, "chamamento publico" = 1. Usuário digita sem acento; confiar na API
  subcontaria. Só o motor local (insensível a acento) cumpre a promessa
- **Prova de cobertura**: nos 13 hits do gabarito da API em 11/08, o motor
  local com o termo SEM acento achou **13/13** (`pipeline/provar-fulltext.ts`)
- **Custo medido**: ~25ms/detalhe com concorrência 8 → **~10s** para varrer
  as ~3,3k publicações do dia. `maxDuration: 300` no adapter por folga
- **Armazenamento**: o content é processado em memória e persistido
  **apenas** para publicações que casaram (`salvarConteudos`); o trecho vai
  no próprio alerta. Ajuste consciente do invariante do bruto: o bruto da
  LISTAGEM é sempre gravado; o detalhe só de quem casou — re-rodar keyword
  nova sobre dias antigos exige re-buscar detalhe (aceito e documentado)
- Falha pontual de detalhe não derruba o dia; acima de 10% vira status
  `erro` na execução

## Seleção — alertas ✔ (parcial)

- `criarAlertas` insere um alerta por (assinante, publicação) com `campo` e
  `trecho` — dedup pelo UNIQUE do banco (`onConflictDoNothing`)
- Assinante suprimido nunca entra (filtro no `listarKeywordsParaMatch`)
- ⚠️ Pendentes: digest (agrupar 10+ por e-mail), envio via Resend com
  `enviado_em` na mesma transação, descadastro

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
