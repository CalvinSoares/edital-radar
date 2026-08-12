# Fonte de Dados — API do DOE-SP

> Tudo que sabemos da API pública do Diário Oficial de SP.
> **Validado por chamadas reais em 2026-08-12** (`pipeline/validate-doe-sp.mjs`,
> relatório em `out/`). Campo sem ⚠️ = confirmado em resposta real.

---

## Base

```
https://do-api-web-search.doe.sp.gov.br/v2
```

- **Sem autenticação** (API pública que o próprio site doe.sp.gov.br usa)
- Existe canal oficial via Integrador SP / Prodesp (`cdesp-catalogos-doe-api-web-search`)
  que exige login gov.br — ⚠️ avaliar registro para uso "de direito" antes do lançamento
- Documentar User-Agent identificável e rate limit gentil no cliente

---

## Endpoints confirmados

### Busca / listagem

```
GET /advanced-search/publications
  ?PageNumber=1&PageSize=100
  &FromDate=YYYY-MM-DD&ToDate=YYYY-MM-DD
  &Terms[0]=chamamento público        ← opcional, repetível (Terms[1]…)
```

Resposta:

```jsonc
{
  "items": [{
    "id": "guid",
    "isLegacy": false,
    "publicationTypeId": "guid",       // tipo estruturado — usar no filtro de match
    "secondLevelSectionId": "guid",
    "thirdLevelSectionId": "guid",
    "date": "2026-08-11T01:00:38.878", // ⚠️ sem offset — tratar como America/Sao_Paulo
    "title": "PORTARIA Nº 97…",
    "slug": "executivo/orgao/titulo-…",// chave natural
    "excerpt": "primeiros ~330 chars",
    "hierarchy": "Executivo > Atos de Pessoal > Secretaria X > …",
    "totalTermsFound": 2,
    "termsFound": [{ "term": "chamamento público", "matchesFound": 2 }]
  }],
  "currentPage": 1, "totalPages": 3146, "totalItems": 3146,
  "pageSize": 1, "hasPreviousPage": false, "hasNextPage": true
}
```

### Detalhe (texto completo)

```
GET /publications/{slug}
```

Retorna também: `journal`, `section`, `publicationType`, `editionPages`,
`content` (**HTML completo**, com estilo inline — sanitizar antes de exibir),
`attachments`, `authCode`.

URL pública correspondente: `https://www.doe.sp.gov.br/{slug}`.

---

## Números de referência (medidos em 10 dias, ago/2026)

| Métrica | Valor |
|---|---|
| Publicações por dia útil | ~3.000–3.400 |
| Fim de semana | **0** (DOE não circula — não é erro) |
| "chamamento público" | 11–24 hits/dia útil |
| "termo de fomento" | 2–32 hits/dia útil |
| "edital de fomento" | raro (0–1) — termo pouco usado na prática |
| Texto completo | 3/3 amostras ok, ~8,7k chars HTML |

Seções mais férteis para fomento: Ciência/Tecnologia, Esportes,
Desenvolvimento Social, Casa Civil.

---

## Armadilhas conhecidas

1. **Busca ≠ oportunidade.** O resultado mistura edital *aberto* com extrato
   de dispensa/inexigibilidade e resultado de edital antigo. Separar é papel
   do match (`publicationTypeId` + `hierarchy` + regex de prazo) — nunca
   alertar keyword crua no plano Radar
2. **`date` sem offset** — normalizar para `America/Sao_Paulo` na borda
3. **`Terms` com acento** funciona, mas sempre URL-encodar
4. **`isLegacy: true`** existe no schema — ⚠️ comportamento não investigado
5. **Encoding**: respostas em UTF-8; cuidado com console Windows ao debugar
   (mojibake no terminal não é bug do dado)
6. Contrato pode mudar sem aviso (API não documentada publicamente) —
   Zod na borda falha alto e o job alarma

---

## Regra para campos novos

Antes de depender de um campo: confirmar por chamada real, registrar aqui a
resposta observada e só então usar. Campo suposto = ⚠️ até prova.
