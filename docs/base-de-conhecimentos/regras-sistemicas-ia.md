# Regras Sistêmicas — comportamento obrigatório neste projeto

> ⭐ Leitura obrigatória em toda interação com o código deste repositório.
> Vale para pessoa e para IA.

---

## Prioridades institucionais (sempre nesta ordem)

1. **Pontualidade e precisão do alerta** — edital com prazo perdido por atraso nosso é o pior defeito possível
2. **Confiabilidade da coleta** — sem coleta não há produto, e o silêncio parece normal
3. **Clareza para quem lê** — zero jargão de Diário Oficial em texto visível
4. **Rastreabilidade** — todo alerta explica por que chegou e linka a fonte
5. **Regra de negócio**
6. **Consistência de UX** (tokens, estados, componentes)
7. **Viabilidade técnica**
8. **Estética** (dentro do sistema visual existente)

---

## Invariantes (não podem ser quebrados)

### Dado

- O JSON **bruto** da API do DOE é sempre gravado. Reprocessamento nunca depende de re-consulta
- Toda resposta de terceiro passa por **Zod antes** de tocar o banco. Mudança de contrato falha alto, nunca em silêncio
- `slug` do DOE é a chave natural da publicação — `UNIQUE` no banco
- Data com timezone explícito: normalizar para `America/Sao_Paulo` na borda
- Fim de semana com 0 publicações é **normal** (DOE não circula); dia útil com 0 publicações é **alarme**

### Alerta

- **Um alerta por assinante por publicação.** Garantido por `UNIQUE` no banco, não por checagem em memória
- `enviado_em` gravado na mesma transação do retorno do provedor de e-mail
- Bounce forte ou reclamação → supressão automática e permanente
- **Nunca** enviar e-mail real fora de produção (modo de envio por env)
- Todo alerta tem: trecho onde o termo apareceu, link para a publicação na fonte e o disclaimer padrão

### Match

- A função de match é **pura**: sem I/O, sem `Date.now()`, sem `Math.random`, sem env
- Regra nova de match só entra com exemplo correspondente em `fixtures/`
- Nunca afirmar prazo/valor extraído sem citar o trecho original ao lado

### Legal / tom

- O produto não dá consultoria jurídica nem escreve o projeto da ONG
- Nunca prometer aprovação, verba ou resultado
- Não logar e-mail, telefone ou qualquer dado pessoal do assinante

---

## Mapa de responsabilidades

| Camada | Responsabilidade |
|---|---|
| `src/app/(rotas)/page.tsx` | Composição — sem lógica |
| `src/app/(rotas)/_components/` | UI exclusiva da página |
| `src/app/(rotas)/hook/` | `*.hook.ts` queries/estado · `*.action.ts` mutations |
| `src/shared/components/` | UI usada em 2+ páginas |
| `src/shared/schema/` | Zod reutilizado |
| `src/server/api/routers/` | Routers tRPC — query Drizzle, `TRPCError` |
| `src/server/coleta/` | Cliente DOE + ingestão (I/O isolado) |
| `src/server/match/` | Regras puras de match (testáveis sem banco) |
| `src/server/alerta/` | Seleção e envio |
| `src/server/db/` | Schema Drizzle + repositórios |

### Regra de acesso

- Página **não** importa Drizzle nem chama a API do DOE
- Job **não** renderiza React
- Antes de criar util/componente novo: verificar `src/shared/` primeiro

---

## Metodologia obrigatória antes de codar

1. **Análise** — qual etapa é afetada: coleta, match, seleção, envio ou interface? Onde nasce o dado?
2. **Reuso** — existe util, hook, componente, schema ou repositório parecido?
3. **Validação de contrato** — o campo do DOE que você quer usar **existe mesmo**? Confirmar em `backend/fonte-doe-sp.md` ou por chamada real. O que acontece quando vier `null`?
4. **Implementação** — regra pura em `src/server/match/`; I/O isolado em cliente/repositório; `page.tsx` só compõe
5. **Validação** — loading, vazio, erro, sucesso; o job continua idempotente?; algum texto visível ganhou jargão?

Se o campo não foi verificado, marcar ⚠️ na documentação e verificar com
chamada real antes de depender dele.

---

## O que nunca fazer

```
✘ Inventar campo ou endpoint do DOE
✘ Persistir resposta de terceiro sem validar com Zod
✘ Descartar o payload bruto
✘ Enviar e-mail real fora de produção
✘ Enviar alerta sem checar o UNIQUE de deduplicação
✘ Colocar I/O, Date ou random dentro do match
✘ Mudar regra de match sem fixture rotulada antes e depois
✘ Usar jargão do Diário em texto visível ("extrato de inexigibilidade")
✘ Afirmar prazo/valor sem citar o trecho original
✘ Prometer aprovação de edital ou verba
✘ Opinar sobre matéria jurídica
✘ Logar dado pessoal do assinante
✘ console.log fora de job CLI com propósito
✘ Tratar 0 publicações em dia útil como sucesso silencioso
```

---

## Formato de resposta para tarefas de feature

1. **Objetivo** — o que muda e por quê
2. **Diagnóstico** — o que existe e o que dá para reaproveitar
3. **Origem do dado** — DOE, banco ou input do usuário; qual campo exatamente
4. **Fluxo** — passo a passo do comportamento
5. **Regras** — negócio, UX e legais envolvidas
6. **Estados** — loading, vazio, erro, sucesso
7. **Riscos** — falso positivo, atraso, contrato do terceiro, entregabilidade
8. **Critérios de aceite** — testáveis
9. **Implementação** — arquivos e testes
10. **Premissas** — o que foi assumido e precisa ser confirmado
