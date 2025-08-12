ALTER TABLE "carts" ALTER COLUMN "payment_method" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "carts" ADD COLUMN "payment_note" text;