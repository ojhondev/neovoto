CREATE TYPE "public"."candidacy_source" AS ENUM('camara', 'senado', 'manual');--> statement-breakpoint
CREATE TABLE "candidacies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid,
	"source" "candidacy_source" NOT NULL,
	"external_id" text NOT NULL,
	"name" text NOT NULL,
	"house" text,
	"party" text,
	"uf" text,
	"photo_url" text,
	"email" text,
	"objective" text,
	"raw" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"refreshed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "candidacies" ADD CONSTRAINT "candidacies_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "candidacies_source_idx" ON "candidacies" USING btree ("source","external_id");