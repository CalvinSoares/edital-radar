# Componentização — Frontend

> Quando, como e onde criar componentes no Edital Radar (Astro + ilhas React).

---

## Regra zero: `.astro` por padrão

Todo componente nasce `.astro` (zero JS no browser). Ele só vira ilha React
(`.tsx`) quando precisa de **estado no client** que um form + reload não
resolve bem. Na dúvida, `.astro`.

| Sinal | Formato |
|---|---|
| Exibe dados, layout, link, form simples | `.astro` |
| Estado local real (arrastar, editar inline, feedback otimista) | ilha `.tsx` |
| "Talvez precise de JS um dia" | `.astro` (migra quando o dia chegar) |

---

## Hierarquia de decisão

1. Já existe em `src/components/ui/`? → **Use**
2. Existe algo próximo adaptável via props? → **Adapte**
3. É exclusivo de uma feature? → `src/components/(feature)/`
4. Segundo uso real em outra feature? → **sobe** para `src/components/ui/`

Nada nasce em `ui/`. Sobe depois do segundo uso real.

---

## Kit base (`src/components/ui/`)

Mesma convenção do state-sell, em `.astro`:

| Componente | Notas |
|---|---|
| `Container.astro` | `size` sm/md/lg |
| `Card.astro` | `rounded-card border-borda bg-cartao` |
| `Button.astro` | variantes `primario`/`neutro`/`fantasma`; **nunca** `<button>` cru em tela |
| `Badge.astro` | inclui variante de prazo (`bg-prazo-suave text-prazo`) |
| `Field.astro` / `Input.astro` / `Select.astro` | label + erro integrados (erro vem do resultado da Action) |
| `Chip.astro` | selecionável via link/form (`ativo` por prop) |

Sem inline-style em tela (exceções: OG image/e-mail, por exigência das
ferramentas de render).

---

## Regras

### Uma responsabilidade

```
// ✘ ERRADO — componente busca os próprios dados
ListaDeAvisos.astro com query Drizzle dentro

// ✔ CERTO — página busca via repositório e passa por props
<ListaDeAvisos itens={itens} />
```

Exceção honesta do Astro: componente `.astro` *pode* buscar dados no próprio
frontmatter — aqui **optamos por não fazer** fora de `src/pages/`, para o
fluxo de dados ter um lugar só.

### Ilhas

- Recebem dados prontos por props; não fazem fetch próprio (podem chamar Action)
- `client:idle`/`client:visible` por padrão; `client:load` só interação imediata
- Uma ilha pequena por interação — nunca "a página em React"

### Props tipadas

```ts
type Props = {
  aviso: { id: string; titulo: string; trecho: string; prazo?: string | null; urlFonte: string };
};
```

Nunca `any`. Em `.astro`, tipar via `interface Props` / `type Props`.

### Tamanho

- Menos de 300 linhas; 3+ blocos independentes → extrair
- Formatação/constantes da feature → `src/shared/utils/`, não no template

---

## Referências

- `padrao-por-pagina.md`
- `tokens-design.md`
- `estados-de-tela.md`
