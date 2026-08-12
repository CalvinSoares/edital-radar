# Padrão por Página

> Estrutura obrigatória para toda feature. Mesmo padrão do state-sell (Next App Router).

---

## Estrutura

```
src/app/(rota)/
├── _components/
│   └── MeuComponente.tsx     # exclusivo desta página
├── utils/
│   └── exemplo.utils.ts      # funções puras, constantes, colunas
├── hook/                     # singular
│   ├── exemplo.hook.ts       # queries tRPC, estado, efeitos
│   └── exemplo.action.ts     # mutations, submit, lógica pesada
└── page.tsx                  # composição — sem lógica
```

---

## `page.tsx` — só composição

- **Sem** `useState`, `useEffect`, `useQuery` ou `useMutation`
- Pode receber `params` / `searchParams` e repassar
- Pode ter Suspense e error boundary

```tsx
// ✔ CERTO
export default function AvisosPage() {
  return (
    <PaginaTemplate
      titulo="Seus avisos"
      subtitulo="O que saiu no Diário Oficial e casa com você"
    >
      <FiltrosDeAviso />
      <ListaDeAvisos />
    </PaginaTemplate>
  );
}
```

---

## `hook/*.hook.ts` — queries e estado

```ts
export function useListaDeAvisos() {
  const { filtros, setFiltro } = useBusca({ parser: filtrosDeAviso });
  const { data, isLoading, error } = api.alerta.listar.useQuery(filtros);
  return { avisos: data?.itens ?? [], total: data?.total ?? 0, filtros, setFiltro, isLoading, error };
}
```

Ao mudar qualquer filtro que não seja paginação, **voltar para a página 1**.
Busca textual sempre com debounce (~300ms).

---

## `hook/*.action.ts` — mutations

```ts
export function useSalvarKeyword() {
  const utils = api.useUtils();
  const { mutate, isPending } = api.keyword.salvar.useMutation({
    onSuccess: () => {
      toast.success("Pronto — vamos vigiar esse termo para você");
      utils.keyword.listar.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  return { salvar: (termo: string) => mutate({ termo }), isPending };
}
```

---

## `utils/*.utils.ts` — puras

Formatações locais, constantes da feature. Nada de I/O.

---

## Regras de componentização

1. Componente com menos de 300 linhas — se passar, extrair
2. Uma responsabilidade por componente
3. Props tipadas, nunca `any`
4. Sem lógica de negócio no JSX
5. Sem `console.log`
6. Sem `<button>` nativo — usar `<Button>` do kit

## Quando subir para `shared/`

| Situação | Ação |
|---|---|
| Componente usado em 2+ páginas | `src/shared/components/` |
| Hook usado em 2+ páginas | `src/shared/hook/` |
| Util usada em 2+ páginas | `src/shared/utils/` |
| Schema Zod reutilizado | `src/shared/schema/` |

Nada nasce em `shared/`. Sobe depois do segundo uso real.

---

## Linguagem da interface

O requisito de produto mais fácil de quebrar sem perceber.

| Escreva | Nunca escreva |
|---|---|
| "Seus avisos" | "Alertas de publicações do DOE" |
| "Sua causa" | "Área de atuação da OSC" |
| "Onde você atua" | "Abrangência territorial" |
| "Saiu edital de cultura em SP" | "Chamamento Público SEC nº 14/2026" |
| "Prazo: quinta, 14/08 — faltam 3 dias" | "Encerramento: 14/08/2026 09:00" |
| "Termo vigiado" | "Keyword monitorada" |

**Teste da tela:** a coordenadora da ONG pararia para perguntar o que uma
palavra significa? Então a tela está errada.

---

## Anti-padrões

```tsx
// ✘ mutation dentro do componente de UI
export function BotaoSalvar() {
  const { mutate } = api.keyword.salvar.useMutation();  // ERRADO
}

// ✘ lógica no page.tsx
export default function Page() {
  const [aberto, setAberto] = useState(false);          // ERRADO
  const { data } = api.alerta.listar.useQuery();        // ERRADO
}

// ✘ jargão vazando na interface
<span>Tipo: Extrato de Inexigibilidade</span>           // ERRADO

// ✘ cor hardcoded
<h1 className="text-[#2456c9]">                         // ERRADO — text-acento
```
