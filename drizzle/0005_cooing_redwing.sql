ALTER TABLE "candidacies" ADD COLUMN "anchor_ibge" text;--> statement-breakpoint
ALTER TABLE "candidacies" ADD COLUMN "base_ibge" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "candidacies" ADD COLUMN "birth_municipio" text;--> statement-breakpoint
ALTER TABLE "candidacies" ADD COLUMN "birth_uf" text;