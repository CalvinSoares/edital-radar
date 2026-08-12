import {
  date,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// O bruto da API do DOE é sempre gravado — reprocessar match nunca exige
// re-consulta. `slug` é a chave natural da publicação.
export const publicacao = pgTable(
  "publicacao",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    titulo: text("titulo").notNull(),
    excerpt: text("excerpt"),
    dataPublicacao: timestamp("data_publicacao", { withTimezone: true }).notNull(),
    hierarchy: text("hierarchy"),
    publicationTypeId: text("publication_type_id"),
    bruto: jsonb("bruto").notNull(),
    // Texto completo (HTML) — persistido só quando a publicação casou com
    // alguma keyword; o match roda em memória durante o job.
    content: text("content"),
    brutoDetalhe: jsonb("bruto_detalhe"),
    contentEm: timestamp("content_em", { withTimezone: true }),
    coletadoEm: timestamp("coletado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("publicacao_slug_unique").on(t.slug)],
);

export const assinante = pgTable("assinante", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  plano: text("plano", { enum: ["free", "radar"] }).notNull().default("free"),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  // Bounce forte ou reclamação → supressão permanente.
  suprimidoEm: timestamp("suprimido_em", { withTimezone: true }),
});

export const keyword = pgTable(
  "keyword",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assinanteId: uuid("assinante_id")
      .notNull()
      .references(() => assinante.id, { onDelete: "cascade" }),
    termo: text("termo").notNull(),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("keyword_assinante_termo_unique").on(t.assinanteId, t.termo)],
);

// Um alerta por assinante por publicação — garantido pelo banco,
// nunca por checagem em memória.
export const alerta = pgTable(
  "alerta",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assinanteId: uuid("assinante_id")
      .notNull()
      .references(() => assinante.id, { onDelete: "cascade" }),
    publicacaoId: uuid("publicacao_id")
      .notNull()
      .references(() => publicacao.id, { onDelete: "cascade" }),
    keywordId: uuid("keyword_id").references(() => keyword.id, { onDelete: "set null" }),
    // Rastreabilidade do e-mail: onde o termo apareceu e o trecho original.
    campo: text("campo", { enum: ["titulo", "excerpt", "content"] }).notNull().default("excerpt"),
    trecho: text("trecho").notNull().default(""),
    // Gravado na mesma transação do retorno do provedor de e-mail.
    enviadoEm: timestamp("enviado_em", { withTimezone: true }),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("alerta_assinante_publicacao_unique").on(t.assinanteId, t.publicacaoId)],
);

// Registro de cada execução do job — alimenta o "última leitura: hoje, 7h04"
// da UI e a monitoração (0 coletados em dia útil = alarme).
export const coletaExecucao = pgTable("coleta_execucao", {
  id: uuid("id").primaryKey().defaultRandom(),
  dataAlvo: date("data_alvo").notNull(),
  status: text("status", { enum: ["ok", "sem_edicao", "erro"] }).notNull(),
  totalColetado: integer("total_coletado").notNull().default(0),
  totalCasado: integer("total_casado").notNull().default(0),
  totalEnviado: integer("total_enviado").notNull().default(0),
  erro: text("erro"),
  executadoEm: timestamp("executado_em", { withTimezone: true }).notNull().defaultNow(),
});
