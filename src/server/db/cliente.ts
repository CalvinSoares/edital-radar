import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = import.meta.env?.DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL não definida");

const conexao = postgres(url, { prepare: false });

export const db = drizzle(conexao, { schema });
