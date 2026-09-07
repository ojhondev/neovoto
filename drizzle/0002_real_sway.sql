ALTER TYPE "public"."candidacy_source" ADD VALUE 'tse' BEFORE 'manual';--> statement-breakpoint
CREATE TABLE "candidate_search_cache" (
	"term" text PRIMARY KEY NOT NULL,
	"results" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "electoral_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidacy_id" uuid NOT NULL,
	"ano" integer NOT NULL,
	"turno" integer DEFAULT 1 NOT NULL,
	"uf_sigla" text NOT NULL,
	"ibge_code" text,
	"tse_code" text,
	"municipio" text NOT NULL,
	"votos" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "candidacies" ADD COLUMN "cargo" text;--> statement-breakpoint
ALTER TABLE "candidacies" ADD COLUMN "election_year" integer;--> statement-breakpoint
ALTER TABLE "candidacies" ADD COLUMN "electoral_status" text DEFAULT 'na' NOT NULL;--> statement-breakpoint
ALTER TABLE "electoral_results" ADD CONSTRAINT "electoral_results_candidacy_id_candidacies_id_fk" FOREIGN KEY ("candidacy_id") REFERENCES "public"."candidacies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "electoral_candidacy_idx" ON "electoral_results" USING btree ("candidacy_id");