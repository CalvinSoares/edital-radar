# Segurança — notas operacionais

> Mitigações do piloto. Não substitui revisão antes de produção pública.

## Vista admin (“ver”)

- `/admin/assinantes` → **ver** abre o painel do assinante.
- Cookie `er_vista` (1h) **só** vale com admin autenticado.
- Mutações no painel bloqueadas (`VISTA_SOMENTE_LEITURA`).
- Barra “Vista admin” + **Sair da vista**.

## Rate limit (em memória)

| Superfície | Limite |
|---|---|
| Login magic-link por IP | 10 / min |
| Login por e-mail | 5 / min |
| Admin entrar por IP | 8 / min |

Em Vercel cada isolate tem seu Map — reduz rajadas, não é quota global.
Para escala: WAF / Upstash / similar.

## Sessão e bounce

- Sessão de assinante **não** autentica se `suprimido_em` ou `descadastrado_em`.
- E-mail suprimido: login responde `{ enviado: true }` **sem** enviar magic-link.
- Cookie admin = HMAC do `ADMIN_SECRET` (não o secret em claro); TTL 8h.
- Comparação de senha admin e token de coleta com tempo constante.

## Ainda consciente

- Rate limit não é distribuído.
- Convites por token UUID (entropia ok; sem brute-force prático).
- Deploy + Resend real continuam gate de produção.
