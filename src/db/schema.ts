import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";

/*
  Modelo de dados da NeoVoto — fase de fundação.
  Princípio LGPD: as tabelas guardam (a) usuários da plataforma — equipes de campanha
  e de gabinete, base legal de execução de contrato — e (b) metadados de análises.
  NÃO há tabela de "eleitor", "perfil psicográfico" ou dado sensível de pessoa natural.
  Dados eleitorais oficiais são carregados em tabelas de staging separadas (ver drizzle/
  migrations futuras) sempre em nível agregado/territorial.
*/

export const userRole = pgEnum("user_role", ["owner", "analyst", "viewer"]);
export const orgKind = pgEnum("org_kind", [
  "partido",
  "candidatura",
  "mandato",
  "consultoria",
  "outro",
]);
export const candidacySource = pgEnum("candidacy_source", ["camara", "senado", "manual"]);

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  kind: orgKind("kind").notNull().default("outro"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    email: text("email").notNull().unique(),
    name: text("name").notNull(),
    role: userRole("role").notNull().default("viewer"),
    passwordHash: text("password_hash").notNull(),
    locale: text("locale").notNull().default("pt"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("users_org_idx").on(t.orgId)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(), // hash do token de sessão
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/**
 * Candidato/político em análise. O usuário informa o nome no onboarding e a plataforma
 * puxa os dados públicos (Câmara / Senado). `raw` guarda o snapshot da fonte oficial.
 * São dados de AGENTE PÚBLICO, já públicos por lei — ver docs/LGPD.md.
 */
export const candidacies = pgTable(
  "candidacies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id").references(() => organizations.id, { onDelete: "set null" }),
    source: candidacySource("source").notNull(),
    externalId: text("external_id").notNull(),
    name: text("name").notNull(),
    house: text("house"), // 'camara' | 'senado' | null
    party: text("party"),
    uf: text("uf"),
    photoUrl: text("photo_url"),
    email: text("email"),
    objective: text("objective"), // objetivo declarado pelo usuário
    raw: jsonb("raw").$type<Record<string, unknown>>().notNull().default({}),
    refreshedAt: timestamp("refreshed_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("candidacies_source_idx").on(t.source, t.externalId)],
);

/** Análises salvas (recorte territorial + parâmetros). Sem PII. */
export const analyses = pgTable(
  "analyses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    tool: text("tool").notNull(),
    title: text("title").notNull(),
    scope: jsonb("scope").notNull().$type<Record<string, unknown>>(),
    params: jsonb("params").notNull().$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("analyses_org_idx").on(t.orgId)],
);

/** Registro de operações (LGPD art. 37) — quem acessou o quê e quando. */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id"),
    userId: uuid("user_id"),
    action: text("action").notNull(),
    target: text("target"),
    meta: jsonb("meta").$type<Record<string, unknown>>(),
    at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("audit_org_idx").on(t.orgId), index("audit_at_idx").on(t.at)],
);

export type User = typeof users.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type Analysis = typeof analyses.$inferSelect;
export type Candidacy = typeof candidacies.$inferSelect;
