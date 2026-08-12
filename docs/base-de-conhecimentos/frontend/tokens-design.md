# Tokens de Design

> Sistema visual canônico do Edital Radar.
> Fonte: `src/styles/global.css` (`:root` + `@theme`).

---

## Paleta (ColorHunt)

`#0F3040` / `#464858` / `#A56F63` / `#D99B7F`

| Token | Uso | Contraste |
|---|---|---|
| `acento` = ink `#0F3040` | CTA primário | + `sobre-acento` creme (13:1) |
| `peach` / `clay` | destaques, underlines, marca, barras | não usar clay claro como fundo de botão |
| `suave` | texto secundário (~72% opacidade) | 5,4:1 sobre fundo (AA) |
| `slate` | labels / nav inativa | 8:1 sobre fundo |
| `ok` / `ok-suave` | sucesso, status saudável | `#1e6b46` = 5,8:1 (AA); dark `#7fd0a0` |
| `erro` / `prazo` | falha / urgência de prazo | |

CTA **não** usa clay `#A56F63` como fundo — falha AA com texto claro.
No dark o acento clareia (peach) e o texto sobre ele vira ink escuro —
nunca `text-white` sobre acento claro.

## Tipografia

| Papel | Família | Nota |
|---|---|---|
| Display | **Bricolage Grotesque** (600–800) | títulos, `.er-brand` (weight 800) |
| Body | **Public Sans** (400–700) | fonte desenhada p/ serviço público — tema da casa |

Carregadas via Google Fonts no `Base.astro`.

## Marca

`BrandMark.astro` — ícone radar SVG (não texto "ER").
`HeroRadar.astro` — radar decorativo do hero: varredura `conic-gradient`
girando (`.er-radar-varredura`, keyframe `er-girar`) + blips pulsando.
Sempre `aria-hidden`; para no `prefers-reduced-motion`.
Favicon: `public/favicon.svg`.

## Cards e composição

- `.er-card` — sombra "papel deslocado" (offset peach), **sem** faixa lateral.
  Hover `.er-lift` empurra o offset (não translateY genérico)
- `.er-card-quiet` — sombra difusa (listas densas, stats)
- `.er-eyebrow` — rótulo de seção (traço clay + uppercase)
- `.er-grid-bg` — grade sutil com máscara radial (hero)
- `.er-bar` — barra de volume relativo (listagem de temas)
- `.er-trilha` / `.er-dia` — trilha vertical com ponto por dia
  (páginas de tema e histórico do painel)
- `.er-table` — tabela do admin (th uppercase, hover zebra)

## Componentes do kit (`src/components/`)

`ui/Button` (primario/neutro/fantasma, `radar` = pulso) · `ui/Card` ·
`ui/Field` · `ui/Badge` (neutro/destaque/prazo/urgente/ok) · `ui/Stat`
(valor + rótulo + detalhe) · `SiteHeader` · `SiteFooter` (nav + disclaimer —
páginas públicas não repetem o disclaimer inline) · `BrandMark` · `HeroRadar`.

## Acessibilidade

- `:focus-visible` global (outline ink) + focos explícitos em nav/botões
- Skip link `.er-skip` no `Base.astro` → `<main id="conteudo">` (toda página)
- `aria-current` na nav ativa; erros de campo com `role="alert"`
- Checkbox/radio com `accent-color: ink`; chips de seleção via `.er-chip`
  (checkbox real oculto, estado com `:has(input:checked)`, ✓ no selecionado)
- Todas as animações respeitam `prefers-reduced-motion`
- Sem overflow horizontal em 375px (marca textual do header some em <440px)
- Gradiente de fundo único e suave (sem camadas que lavem o texto)
