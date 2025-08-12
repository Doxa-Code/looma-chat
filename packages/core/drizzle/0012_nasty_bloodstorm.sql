ALTER TABLE "products" ALTER COLUMN "code" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "phone_id" text DEFAULT '' NOT NULL;