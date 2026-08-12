# Estados de Tela — Loading, Empty e Error

> Padrões obrigatórios. Com SSR, a página chega **pronta** — loading é
> exceção, não regra.

---

## Regra fundamental (SSR muda o jogo)

A página renderiza no servidor com os dados já resolvidos. Portanto:

- **Não** existe skeleton de carga inicial — o HTML chega completo
- Loading só existe em **submissão de form/Action** e em ilhas
- Os estados que TODA listagem precisa tratar no template: **vazio** e **erro
  de Action** (o erro de leitura vira página de erro, não estado inline)

```astro
---
const { itens, total } = await listarAvisos({ ... }); // falhou? → error page
---
{itens.length === 0
  ? <VazioDaTela />
  : <ListaDeAvisos itens={itens} />}
```

---

## Loading (onde ainda existe)

| Situação | Tratamento |
|---|---|
| Submit de form | `<Button>` com estado `enviando` (disable + "Salvando…") — pequena ilha ou atributo via JS mínimo |
| Ilha chamando Action | estado `isPending` local na ilha |
| Navegação | View Transitions do Astro (opcional) — nunca spinner de página inteira |

---

## Error

| Contexto | Tratamento |
|---|---|
| Detalhe inexistente (`/aviso/[id]`) | `Astro.response.status = 404` + render da página 404 (`src/pages/404.astro`) |
| Falha de leitura no frontmatter | Página de erro padrão (`src/pages/500.astro`): "Algo deu errado ao carregar. Tente de novo em instantes." |
| `ActionError` em form | Mensagem canônica junto ao campo (`Field erro={...}`) — ver `padrao-erros-usuario.md` |
| Cron/coleta | Log CLI + notificação interna — nunca aparece para o usuário |

---

## Empty (copy para humanos — sem jargão de coleta/CLI)

| Caso | Copy sugerida |
|---|---|
| Assinante novo, sem keywords | "Você ainda não vigia nenhum termo. Comece com o nome da sua ONG." |
| Keywords cadastradas, nenhum aviso ainda | "Nada por enquanto. A gente lê o Diário todo dia útil e avisa assim que sair algo." |
| Filtro sem resultado | "Nada bateu com esses filtros." |
| Fim de semana / sem edição | "O Diário Oficial não circula em fim de semana. Voltamos segunda." |

**Empty ≠ error.** "Nenhum aviso hoje" é o estado mais comum do produto —
precisa parecer normal e confiável, nunca quebrado. Sempre que possível,
mostrar a data/hora da última leitura do Diário ("Última leitura: hoje, 7h04",
via `ultimaColeta()`).

---

## Feedback proibido

- `alert()`, `window.confirm()`
- `console.log` como feedback de UX
- Spinner de página inteira
- Esconder aviso de prazo encerrado (mostrar como "encerrado", não sumir)

---

## Referências

- `padrao-erros-usuario.md`
- `padrao-por-pagina.md`
