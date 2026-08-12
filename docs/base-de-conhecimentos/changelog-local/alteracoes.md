# Changelog Local

> Registro de mudanças relevantes (schema, contratos, regras, tokens).
> Mais recente primeiro.

---

## 2026-08-12 — Fundação

- Fonte DOE-SP validada por chamadas reais (`pipeline/validate-doe-sp.mjs`,
  10 dias): API pública sem auth, busca por termo, texto completo ok.
  Números em `backend/fonte-doe-sp.md`
- Base de conhecimentos criada (padrão president/state-sell): contexto,
  regras sistêmicas, tokens, padrão por página, componentização, estados de
  tela, erros, contratos tRPC, coleta e match
- Decisões de produto registradas: um repo/uma marca (Watch = plano free do
  Radar); v1 só SP; sem LLM no v1; tokens pt-BR com semântica de prazo
- Nenhum código de app ainda — próximo passo: fundação Next + schema Drizzle
  + job de coleta (fase Watch)
