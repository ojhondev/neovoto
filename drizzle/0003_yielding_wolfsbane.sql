CREATE TABLE "report_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidacy_id" uuid NOT NULL,
	"modulo" text NOT NULL,
	"titulo" text NOT NULL,
	"texto" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"code" text PRIMARY KEY NOT NULL,
	"candidacy_id" uuid NOT NULL,
	"candidato_nome" text NOT NULL,
	"hash" text NOT NULL,
	"conteudo" jsonb NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "report_items_candidacy_idx" ON "report_items" USING btree ("candidacy_id");