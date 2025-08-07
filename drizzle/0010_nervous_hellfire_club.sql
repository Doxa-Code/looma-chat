ALTER TABLE "settings" ALTER COLUMN "waba_id" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "attendant_name" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "business_name" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "location_available" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "payment_methods" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "settings" ALTER COLUMN "vector_namespace" SET DEFAULT '';--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "knowledge_base" text DEFAULT '' NOT NULL;