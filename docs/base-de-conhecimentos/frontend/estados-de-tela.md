# Estados de Tela — Loading, Empty e Error

> Padrões obrigatórios para todo dado assíncrono.

---

## Regra fundamental

```tsx
if (isLoading) return <SkeletonDaLista />;
if (error) return <ErroDeTela onRetry={refetch} />;
if (!itens.length) return <VazioDaTela />;
return <Lista itens={itens} />;
```

Nunca renderizar lista assumindo que `data` existe sem checar `isLoading`.

---

## Loading

Preferir skeletons fiéis ao layout real:

```tsx
// ✔ lista de avisos
{isLoading && (
  <div className="mt-8 grid gap-4">
    {Array.from({ length: 5 }, (_, i) => <CardDeAvisoSkeleton key={i} />)}
  </div>
)}

// ✘ spinner genérico
{isLoading && <p>Carregando...</p>}
```

---

## Error

| Contexto | Tratamento |
|---|---|
| Detalhe (`/aviso/[id]`) | `notFound()` do Next |
| Listagem | Mensagem inline + retry (`refetch`) |
| Rede / 5xx | "Algo deu errado ao carregar. Tente de novo em instantes." |
| Mutation | toast com a mensagem do backend |

Detalhes: `padrao-erros-usuario.md`.

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
mostrar a data/hora da última leitura do Diário ("Última leitura: hoje, 7h04").

---

## Feedback proibido

- `alert()`, `window.confirm()`
- `console.log` como feedback de UX
- Toast genérico ignorando a mensagem do backend
- Esconder aviso de prazo encerrado (mostrar como "encerrado", não sumir)

---

## Referências

- `padrao-erros-usuario.md`
- `padrao-por-pagina.md`
