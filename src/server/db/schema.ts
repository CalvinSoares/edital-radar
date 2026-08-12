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
  plano: text("plano", { enum: ["free", "radar", "federacao"] }).notNull().default("free"),
  // Token do link de descadastro em 1 clique (vai em todo e-mail).
  descadastroToken: uuid("descadastro_token").notNull().defaultRandom().unique(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  // Descadastro voluntário (link do e-mail).
  descadastradoEm: timestamp("descadastrado_em", { withTimezone: true }),
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
    // keyword = Watch; perfil = Radar (causa+região).
    origem: text("origem", { enum: ["keyword", "perfil"] }).notNull().default("keyword"),
    // Rastreabilidade do e-mail: onde o termo apareceu e o trecho original.
    campo: text("campo", { enum: ["titulo", "excerpt", "content"] }).notNull().default("excerpt"),
    trecho: text("trecho").notNull().default(""),
    // Resumo humano (Radar) — template a partir de título/excerpt/órgão.
    resumo: text("resumo"),
    prazoEm: timestamp("prazo_em", { withTimezone: true }),
    prazoTrecho: text("prazo_trecho"),
    // Gravado na mesma transação do retorno do provedor de e-mail.
    enviadoEm: timestamp("enviado_em", { withTimezone: true }),
    // Feedback do assinante: "isso não era pra mim" — fecha o loop de precisão.
    irrelevanteEm: timestamp("irrelevante_em", { withTimezone: true }),
    // Admin revisa a fila e classifica para afinar regras (fixtures / BLOQUEIOS).
    feedbackRevisao: text("feedback_revisao", {
      enum: ["falso_positivo_filtro", "termo_ruim", "catalogo", "descartado"],
    }),
    feedbackRevisaoEm: timestamp("feedback_revisao_em", { withTimezone: true }),
    // oportunidade = match normal; retificacao = aviso de mudança em algo já alertado.
    tipo: text("tipo", { enum: ["oportunidade", "retificacao"] }).notNull().default("oportunidade"),
    // Alerta anterior (mesmo assinante) que esta retificação atualiza.
    alertaOrigemId: uuid("alerta_origem_id"),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("alerta_assinante_publicacao_unique").on(t.assinanteId, t.publicacaoId)],
);

// Perfil do plano Radar — causas + regiões de catálogo fechado.
export const perfilRadar = pgTable("perfil_radar", {
  assinanteId: uuid("assinante_id")
    .primaryKey()
    .references(() => assinante.id, { onDelete: "cascade" }),
  /** Slugs de CATALOGO_DE_CAUSAS (máx 3). */
  causas: jsonb("causas").$type<string[]>().notNull().default([]),
  /** Slugs de CATALOGO_DE_REGIOES (máx 3). */
  regioes: jsonb("regioes").$type<string[]>().notNull().default([]),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});

// Classificação por tema (páginas públicas de SEO) — preenchida pelo job
// diário na mesma passada do match de keywords.
export const publicacaoTema = pgTable(
  "publicacao_tema",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicacaoId: uuid("publicacao_id")
      .notNull()
      .references(() => publicacao.id, { onDelete: "cascade" }),
    tema: text("tema").notNull(),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("publicacao_tema_unique").on(t.publicacaoId, t.tema)],
);

// Magic-link: token de uso único com validade curta. O próprio id é o token.
export const loginToken = pgTable("login_token", {
  id: uuid("id").primaryKey().defaultRandom(),
  assinanteId: uuid("assinante_id")
    .notNull()
    .references(() => assinante.id, { onDelete: "cascade" }),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  expiraEm: timestamp("expira_em", { withTimezone: true }).notNull(),
  usadoEm: timestamp("usado_em", { withTimezone: true }),
});

// Sessão de painel: o id vai no cookie (httpOnly).
export const sessao = pgTable("sessao", {
  id: uuid("id").primaryKey().defaultRandom(),
  assinanteId: uuid("assinante_id")
    .notNull()
    .references(() => assinante.id, { onDelete: "cascade" }),
  criadaEm: timestamp("criada_em", { withTimezone: true }).notNull().defaultNow(),
  expiraEm: timestamp("expira_em", { withTimezone: true }).notNull(),
  revogadaEm: timestamp("revogada_em", { withTimezone: true }),
});

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

// Pasta "salvei pra depois" — por assinante + publicação.
export const salvo = pgTable(
  "salvo",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assinanteId: uuid("assinante_id")
      .notNull()
      .references(() => assinante.id, { onDelete: "cascade" }),
    publicacaoId: uuid("publicacao_id")
      .notNull()
      .references(() => publicacao.id, { onDelete: "cascade" }),
    alertaId: uuid("alerta_id").references(() => alerta.id, { onDelete: "set null" }),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("salvo_assinante_publicacao_unique").on(t.assinanteId, t.publicacaoId)],
);

// Conta compartilhada: equipe Radar (dono + até 2 membros).
export const equipe = pgTable("equipe", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull().default("Minha ONG"),
  donoAssinanteId: uuid("dono_assinante_id")
    .notNull()
    .references(() => assinante.id, { onDelete: "cascade" })
    .unique(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const equipeMembro = pgTable(
  "equipe_membro",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    equipeId: uuid("equipe_id")
      .notNull()
      .references(() => equipe.id, { onDelete: "cascade" }),
    assinanteId: uuid("assinante_id")
      .notNull()
      .references(() => assinante.id, { onDelete: "cascade" }),
    papel: text("papel", { enum: ["dono", "membro"] }).notNull().default("membro"),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("equipe_membro_equipe_assinante_unique").on(t.equipeId, t.assinanteId),
    uniqueIndex("equipe_membro_assinante_unique").on(t.assinanteId),
  ],
);

export const equipeConvite = pgTable("equipe_convite", {
  id: uuid("id").primaryKey().defaultRandom(),
  equipeId: uuid("equipe_id")
    .notNull()
    .references(() => equipe.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  criadoPorAssinanteId: uuid("criado_por_assinante_id")
    .notNull()
    .references(() => assinante.id, { onDelete: "cascade" }),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  expiraEm: timestamp("expira_em", { withTimezone: true }).notNull(),
  aceitoEm: timestamp("aceito_em", { withTimezone: true }),
});

// Federação B2B: N assentos Radar para uma rede (CONDECA, COMAS…).
export const federacao = pgTable("federacao", {
  id: uuid("id").primaryKey().defaultRandom(),
  nome: text("nome").notNull(),
  adminAssinanteId: uuid("admin_assinante_id")
    .notNull()
    .references(() => assinante.id, { onDelete: "cascade" }),
  assentos: integer("assentos").notNull().default(10),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const federacaoAssento = pgTable(
  "federacao_assento",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    federacaoId: uuid("federacao_id")
      .notNull()
      .references(() => federacao.id, { onDelete: "cascade" }),
    assinanteId: uuid("assinante_id")
      .notNull()
      .references(() => assinante.id, { onDelete: "cascade" }),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("federacao_assento_assinante_unique").on(t.assinanteId),
    uniqueIndex("federacao_assento_fed_assinante_unique").on(t.federacaoId, t.assinanteId),
  ],
);

export const federacaoConvite = pgTable("federacao_convite", {
  id: uuid("id").primaryKey().defaultRandom(),
  federacaoId: uuid("federacao_id")
    .notNull()
    .references(() => federacao.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  criadoPorAssinanteId: uuid("criado_por_assinante_id")
    .notNull()
    .references(() => assinante.id, { onDelete: "cascade" }),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  expiraEm: timestamp("expira_em", { withTimezone: true }).notNull(),
  aceitoEm: timestamp("aceito_em", { withTimezone: true }),
});

/** Digest “nada saiu esta semana” — 1× por assinante por semana ISO. */
export const digestVazioEnvio = pgTable(
  "digest_vazio_envio",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assinanteId: uuid("assinante_id")
      .notNull()
      .references(() => assinante.id, { onDelete: "cascade" }),
    semanaIso: text("semana_iso").notNull(),
    enviadoEm: timestamp("enviado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("digest_vazio_assinante_semana_unique").on(t.assinanteId, t.semanaIso)],
);

/** Tradutor — checklist “serve pra mim?” por alerta. */
export const checklistTradutor = pgTable("checklist_tradutor", {
  alertaId: uuid("alerta_id")
    .primaryKey()
    .references(() => alerta.id, { onDelete: "cascade" }),
  assinanteId: uuid("assinante_id")
    .notNull()
    .references(() => assinante.id, { onDelete: "cascade" }),
  /** Mapa itemId → "sim" | "nao" | "nao_sei". */
  respostas: jsonb("respostas").$type<Record<string, "sim" | "nao" | "nao_sei">>().notNull().default({}),
  atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
});
