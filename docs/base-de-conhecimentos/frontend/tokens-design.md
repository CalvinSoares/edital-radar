# Tokens de Design

> Sistema visual canônico do Edital Radar.
> Fonte (quando o app existir): `src/app/globals.css` (`:root` + `@theme`).
> Convenção idêntica à do state-sell: tokens em pt-BR, Tailwind v4.

---

## Princípio

**Nunca inventar paleta paralela.** Toda cor/tipografia/sombra nova deve:

1. Reusar token existente, ou
2. Ser adicionada como CSS var em `:root` **e** espelhada no bloco `@theme`

Só o que está no `@theme` vira utilitário Tailwind.

---

## Cores (CSS variables)

Identidade: azul institucional (confiança/oficial) + âmbar como cor de
**prazo** — a informação mais importante do produto tem cor própria.

```css
:root {
  --fundo: #f7f6f2;          /* fundo geral (claro, papel) */
  --cartao: #ffffff;         /* superfícies/cards */
  --tinta: #1a2433;          /* texto principal */
  --suave: rgba(26, 36, 51, 0.62);  /* texto secundário */
  --acento: #2456c9;         /* marca / CTA primário */
  --acento-forte: #163a8f;   /* hover CTA */
  --acento-suave: rgba(36, 86, 201, 0.12); /* fundos de destaque */
  --sobre-acento: #ffffff;   /* texto sobre acento */
  --prazo: #b45309;          /* datas-limite, urgência (âmbar) */
  --prazo-suave: rgba(180, 83, 9, 0.14);
  --borda: rgba(26, 36, 51, 0.12);
  --campo-bg: rgba(26, 36, 51, 0.04);
  --erro: #b3261e;
}

[data-theme="dark"], @media (prefers-color-scheme: dark) { /* … */
  /* No escuro o acento clareia (ex.: #7da3f5). Texto sobre acento vira
     tinta escura — revalidar contraste AA, nunca assumir branco. */
}
```

### Uso Tailwind (via `@theme`)

| Token | Classe exemplo | Uso |
|---|---|---|
| `tinta` | `text-tinta`, `text-tinta/60` | Texto e hierarquia |
| `fundo` / `cartao` | `bg-fundo`, `bg-cartao` | Página / cards |
| `acento` | `bg-acento`, `text-acento` | Marca, CTA, links |
| `acento-forte` | `hover:bg-acento-forte` | Hover CTA |
| `sobre-acento` | `text-sobre-acento` | Texto em botão de acento — **nunca `text-white`** |
| `prazo` | `text-prazo`, `bg-prazo-suave` | Prazos e contagem regressiva |
| `borda` | `border-borda` | Separadores e cards |
| `campo` | `bg-campo` | Inputs |
| `erro` | `text-erro` | Validação |

### Semântica do prazo

| Situação | Estilo |
|---|---|
| Prazo > 7 dias | texto normal `text-tinta/60` |
| Prazo ≤ 7 dias | `text-prazo` + "faltam N dias" |
| Prazo ≤ 48h | `text-prazo font-semibold` + badge `bg-prazo-suave` |
| Encerrado | `text-tinta/40` + "encerrado" (nunca esconder) |

---

## Tipografia

| Papel | Classe | Uso |
|---|---|---|
| Display | `font-display` | Brand, H1/H2 |
| Body | `font-sans` (default) | Texto, nav, labels |

Escala típica: H1 `font-display text-4xl md:text-5xl font-bold text-acento`;
subtítulo `text-tinta/60`; label `text-sm text-tinta/55 font-semibold`.

---

## Componentes de interação (padrão visual)

```
Input/Select:  rounded-xl border border-borda bg-campo focus:border-acento
CTA primário:  rounded-xl bg-acento text-sobre-acento hover:bg-acento-forte
Botão ghost:   border border-borda hover:border-acento
Card:          rounded-card border border-borda bg-cartao
```

---

## Armadilhas Tailwind v4 (herdadas do state-sell — reais)

- `bg-[--campo-bg]` / `rounded-[--radius-card]` (sintaxe curta) **foi
  removida no v4** — gera CSS vazio silenciosamente. Usar o utilitário do
  token (`bg-campo`, `rounded-card`) ou `bg-[var(--x)]` explícito
- Token novo sem entrada no `@theme` não vira classe — falha silenciosa
- Contraste no dark: acento claro + `text-white` reprova WCAG AA. Sempre
  `text-sobre-acento`

---

## Checklist ao criar UI

- [ ] Cores só via tokens (`text-acento`, não `#2456c9` solto — exceto em `globals.css`)
- [ ] Prazo sempre com a semântica de urgência acima
- [ ] Cards com `border-borda` + `rounded-card`
- [ ] Loading com skeleton do layout real
- [ ] Mobile: sem overflow horizontal em 375px
- [ ] Dark mode revalidado (contraste AA em botões de acento)
