# Componentização — Frontend

> Quando, como e onde criar componentes React no Edital Radar.

---

## Hierarquia de decisão

Antes de criar qualquer componente:

1. Já existe em `src/shared/components/`? → **Use**
2. Existe algo próximo adaptável via props? → **Adapte**
3. É exclusivo de **uma** página? → `_components/` da rota
4. Segundo uso real em outra página? → **sobe** para `src/shared/components/`

```
Preciso de UI
      │
      ▼
Existe em shared/components?
  ├── Sim → Use
  └── Não ↓
Serve em 2+ páginas (uso real, não previsão)?
  ├── Sim → src/shared/components/
  └── Não → _components/ da rota
```

---

## Kit base (`src/shared/components/ui.tsx`)

Mesma convenção do state-sell — criar na fundação do app e usar em toda tela:

| Componente | Notas |
|---|---|
| `Container` | `size` sm/md/lg |
| `Card` | `rounded-card border-borda bg-cartao` |
| `Button` / `LinkButton` | variantes `primario`/`neutro`/`fantasma`; **nunca** `<button>` nativo em tela |
| `Badge` | inclui variante de prazo (`bg-prazo-suave text-prazo`) |
| `Field` / `Input` / `Select` | label + erro integrados |
| `Chip` | selecionável (`ativo`), usado em causas/keywords |

Sem inline-style em tela (exceções: OG image/e-mail, por exigência de
satori/clientes de e-mail).

---

## Regras

### Uma responsabilidade

```tsx
// ✘ ERRADO — card + fetch juntos
export function CardDeAviso() {
  const { data } = api.alerta.listar.useQuery(); // fetch é do hook da página
}

// ✔ CERTO — hook da página busca; card só exibe
<CardDeAviso aviso={aviso} />
```

### Props e emits tipados

```tsx
type Props = {
  aviso: {
    id: string;
    titulo: string;
    trecho: string;
    prazo?: string | null;
    urlFonte: string;
  };
  onDispensar?: (id: string) => void;
};
```

Nunca `any`. Callbacks nomeados `onVerbo`.

### Tamanho

- Menos de 300 linhas por componente; 3+ blocos independentes → extrair
- Lógica de filtro/debounce → hook, não no card

---

## Referências

- `padrao-por-pagina.md`
- `tokens-design.md`
- `estados-de-tela.md`
