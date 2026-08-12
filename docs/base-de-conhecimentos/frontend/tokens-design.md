# Tokens de Design

> Sistema visual canônico do Edital Radar.
> Fonte: `src/styles/global.css` (`:root` + `@theme`).

---

## Paleta (ColorHunt)

`#0F3040` / `#464858` / `#A56F63` / `#D99B7F`

| Token | Uso | Contraste |
|---|---|---|
| `acento` = ink `#0F3040` | CTA primário | + `sobre-acento` creme (AA) |
| `peach` / `clay` | destaques, underlines, marca | não usar clay claro como fundo de botão |
| `suave` | texto secundário (~72% opacidade) | legível sobre fundo |
| `slate` | labels / nav inativa | |

CTA **não** usa clay `#A56F63` como fundo — falha AA com texto claro.

## Marca

`BrandMark.astro` — ícone radar SVG (não texto “ER”).
Favicon: `public/favicon.svg`.

## Cards

`.er-card` — sombra “papel deslocado” (offset peach), **sem** faixa lateral.
Hover `.er-lift` empurra o offset (não translateY genérico).

## Acessibilidade

- Focus visível (`outline-ink`) em botões, nav e campos
- `aria-current` na nav ativa; erros de campo com `role="alert"`
- Gradiente de fundo único e suave (sem camadas que lavem o texto)
