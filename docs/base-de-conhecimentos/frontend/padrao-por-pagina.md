# Padrão por Página

> Estrutura obrigatória para toda rota Astro do Edital Radar.

---

## Anatomia de uma página

```astro
---
// frontmatter — roda no SERVIDOR a cada request (ou no build, se prerender)
// 1. sessão/guarda  2. ler query string  3. chamar repositório  4. resultado de Action
---
<!-- template — HTML com componentes .astro; ilha React só se interativo -->
```

```
src/pages/avisos/index.astro        # rota
src/components/avisos/              # componentes da feature
src/server/db/repositorios/         # de onde vêm os dados
src/actions/index.ts                # para onde vão as mutations
```

---

## Frontmatter — só orquestração

| Pode | Não deve |
|---|---|
| Checar sessão e redirecionar | Montar SQL inline (usar repositório) |
| Ler `Astro.url.searchParams` | Chamar a API do DOE |
| Chamar funções de `src/server/` | Lógica de match/seleção |
| `Astro.getActionResult(...)` | Formatação complexa (extrair p/ util) |
| `export const prerender = true` em página pública | Segredos em página prerender |

```astro
---
export const prerender = false;

const sessao = await exigirSessao(Astro); // redireciona se não logado
const pagina = Number(Astro.url.searchParams.get("pagina") ?? 1);
const { itens, total } = await listarAvisos({ assinanteId: sessao.assinanteId, pagina });
---
<PaginaBase titulo="Seus avisos" subtitulo="O que saiu no Diário e casa com você">
  <ListaDeAvisos itens={itens} />
  <Paginacao total={total} atual={pagina} />
</PaginaBase>
```

---

## Estado da tela = URL

Sem estado de filtro em JavaScript. Filtros e paginação vivem na **query
string** (`?termo=cultura&pagina=2`):

1. Formulário de filtro faz `GET` para a própria rota
2. Mudou qualquer filtro que não seja paginação → link/submit **sem** `pagina` (volta para 1)
3. Links de paginação preservam os demais parâmetros

Benefício direto: toda listagem filtrada é compartilhável e indexável.

---

## Mutations — Astro Actions

Formulário HTML + Action. Funciona sem JS (progressive enhancement); ilha só
para melhorar, nunca para funcionar.

```astro
---
import { actions } from "astro:actions";
const resultado = Astro.getActionResult(actions.keyword.salvar);
---
<form method="POST" action={actions.keyword.salvar}>
  <Field name="termo" label="Termo para vigiar" erro={resultado?.error} />
  <Button>Vigiar termo</Button>
</form>
```

Regras:

- Action valida com Zod e lança `ActionError` com `MensagemDeErro` (ver `padrao-erros-usuario.md`)
- Sucesso → redirect (pattern POST-redirect-GET) para evitar re-submit
- Ilha React chamando `actions.x.y()` direto: só quando a UX pedir de verdade
  (ex.: remover keyword sem recarregar) — e o form continua funcionando sem ela

---

## Ilhas (React)

- Página **nunca** é uma ilha inteira
- Ilha recebe dados prontos por props — não busca dados própria (exceto chamar Action)
- Diretiva certa: `client:load` só para interação imediata; preferir `client:idle`/`client:visible`

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

## SEO (páginas públicas)

- `prerender = true` + `<title>`/description próprios por página
- Página programática (ex.: publicações do dia por tema) é conteúdo de
  produto: URL estável, heading claro, data visível, link para a fonte

---

## Anti-padrões

```astro
// ✘ SQL na página
const rows = await db.select().from(publicacao)...   // ERRADO — repositório

// ✘ estado de filtro em ilha
const [filtro, setFiltro] = useState("")             // ERRADO — query string

// ✘ ilha para conteúdo estático
<ListaDeAvisos client:load />                        // ERRADO — .astro puro

// ✘ jargão vazando
<span>Tipo: Extrato de Inexigibilidade</span>        // ERRADO

// ✘ cor hardcoded
<h1 class="text-[#2456c9]">                          // ERRADO — text-acento
```
