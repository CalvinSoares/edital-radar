# Padrão de Erros ao Usuário

> Como exibir e propagar erros (Astro Actions + páginas SSR).

---

## Objetivo

O usuário vê **mensagem factual e curta** em português, sem jargão técnico.
Detalhe técnico fica no server log / job CLI.

---

## Fluxo

```
Action (src/actions/)
  └─ ActionError({ code, message: MensagemDeErro.X })
        ↓
Form:   Astro.getActionResult(...) → erro junto ao campo
Ilha:   const { error } = await actions.x.y(...) → mensagem inline/toast
Página: recurso inexistente → 404 · falha de leitura → 500
```

---

## Server — mensagens canônicas

Fonte única `src/server/erros.ts`:

```ts
export const MensagemDeErro = {
  NAO_AUTORIZADO: "Você precisa entrar para fazer isso",
  TERMO_OBRIGATORIO: "Escreva o termo que você quer vigiar",
  TERMO_MUITO_CURTO: "O termo precisa ter pelo menos 3 letras",
  LIMITE_DE_TERMOS: "Seu plano permite até 3 termos vigiados",
  AVISO_NAO_ENCONTRADO: "Esse aviso não existe mais",
  EMAIL_INVALIDO: "Confira o e-mail digitado",
} as const;
```

```ts
// uso na Action
import { ActionError } from "astro:actions";
if (total >= 3) throw new ActionError({ code: "FORBIDDEN", message: MensagemDeErro.LIMITE_DE_TERMOS });
```

Nunca `throw new Error` solto em Action — sempre `ActionError` com mensagem
canônica. Erro de validação Zod já vira `inputErrors` automaticamente — as
mensagens do schema Zod também usam copy canônica. Jobs de coleta podem usar
`console.error` (CLI, com propósito).

---

## Client

### Form (padrão)

```astro
---
import { actions, isInputError } from "astro:actions";
const resultado = Astro.getActionResult(actions.keyword.salvar);
const erroTermo = isInputError(resultado?.error)
  ? resultado.error.fields.termo?.[0]
  : resultado?.error?.message;
---
<form method="POST" action={actions.keyword.salvar}>
  <Field name="termo" label="Termo para vigiar" erro={erroTermo} />
  <Button>Vigiar termo</Button>
</form>
```

Sucesso → redirect (POST-redirect-GET). A mensagem do backend **já é** a
copy final — não sobrescrever com texto genérico.

### Detalhe / recurso único → 404 de página

```astro
---
const aviso = await detalheAviso({ assinanteId, id });
if (!aviso) {
  Astro.response.status = 404;
  return Astro.rewrite("/404");
}
---
```

### Ilha React → mensagem inline

```ts
const { error } = await actions.keyword.remover({ id });
if (error) setMensagem(error.message);
```

---

## Checklist nova Action / página

- [ ] Action usa `ActionError` + `MensagemDeErro`; Zod com mensagens canônicas
- [ ] Form renderiza `getActionResult` (erro junto ao campo)
- [ ] Detalhe inexistente devolve 404 real (status + página)
- [ ] Sem `console.log` de payload
- [ ] Mensagem legível pela coordenadora da ONG (teste da tela)

---

## Referências

- `estados-de-tela.md`
- `backend/api-contracts.md`
