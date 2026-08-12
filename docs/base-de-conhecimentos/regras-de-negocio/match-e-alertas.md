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

### Limitação conhecida / decisão pendente (antes do digest)

Medido em 2026-08-12 (3.315 publicações reais): o match sobre
`titulo + excerpt` acha **menos** que a busca full-text da própria API
(9 × 11–24 hits/dia para "chamamento público") — o excerpt tem só ~330
caracteres. Opções para fechar o gap:

| Opção | Custo | Nota |
|---|---|---|
| A — Buscar `content` de toda publicação | ~3,3k requests/dia | Pesado, mas viável (~3 min) |
| B — Uma busca `Terms` na API por termo único/dia + detalhe só dos hits | ~1 request por termo | **Recomendada** — barata e full-text; o job continua gravando tudo no banco |
| C — Aceitar título+excerpt no v1 | zero | Subconta; ok só para beta fechado |

Decidir antes de ligar o envio de e-mail — subcontar alerta quebra a promessa
do produto.

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
