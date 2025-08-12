ALTER TABLE "products_on_cart" DROP CONSTRAINT "products_on_cart_product_id_products_id_fk";
--> statement-breakpoint
ALTER TABLE "products_on_cart" ADD COLUMN "description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "products_on_cart" ADD COLUMN "price" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "products_on_cart" ADD COLUMN "real_price" integer DEFAULT 0 NOT NULL;