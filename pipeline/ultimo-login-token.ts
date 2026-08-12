// Dev only: mostra o último magic-link criado (em produção ele chega por e-mail).
//   pnpm tsx --env-file=.env pipeline/ultimo-login-token.ts
import { desc } from "drizzle-orm";
import { db } from "../src/server/db/cliente";
import { loginToken } from "../src/server/db/schema";

const [t] = await db
  .select({ id: loginToken.id, usadoEm: loginToken.usadoEm })
  .from(loginToken)
  .orderBy(desc(loginToken.criadoEm))
  .limit(1);

console.log(t ? `TOKEN=${t.id} usado=${t.usadoEm ? "sim" : "não"}` : "nenhum token");
process.exit(0);
