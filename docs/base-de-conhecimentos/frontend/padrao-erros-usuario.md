# Padrão de Erros ao Usuário

> Como exibir e propagar erros (tRPC + Next).

---

## Objetivo

O usuário vê **mensagem factual e curta** em português, sem jargão técnico.
Detalhe técnico fica no server log / job CLI.

---

## Fluxo

```
Router tRPC
  └─ TRPCError({ code, message: MensagemDeErro.X })
        ↓
useQuery → error  |  useMutation → onError
        ↓
Query de página: ErroDeTela + retry
Mutation:        toast.error(e.message)
Detalhe 404:     notFound()
```

---

## Server — mensagens canônicas

Fonte única `src/server/api/erros.ts` (criar na fundação):

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
// uso no router
if (!termo) throw new TRPCError({ code: "BAD_REQUEST", message: MensagemDeErro.TERMO_OBRIGATORIO });
```

Nunca `throw new Error` solto em router — sempre `TRPCError` com mensagem
canônica. Jobs de coleta podem usar `console.error` (CLI, com propósito).

---

## Client

### Detalhe / recurso único → 404 de página

```ts
if (!aviso) notFound();
```

### Listagem → erro inline com retry

```tsx
{error && <ErroDeTela mensagem="Algo deu errado ao carregar." onRetry={() => refetch()} />}
```

### Mutation → toast com a mensagem do backend

```ts
onError: (e) => toast.error(e.message),
```

A mensagem do backend **já é** a copy final (canônica, pt-BR) — não
sobrescrever com texto genérico no client.

---

## Checklist nova API / page

- [ ] Router usa `TRPCError` + `MensagemDeErro`
- [ ] Input validado com Zod no `input()` do procedure
- [ ] Page trata `error` de query (tela) e de mutation (toast)
- [ ] Sem `console.log` de payload
- [ ] Mensagem legível pela coordenadora da ONG (teste da tela)

---

## Referências

- `estados-de-tela.md`
- `backend/api-contracts.md`
