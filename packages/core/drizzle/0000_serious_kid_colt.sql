CREATE TABLE "development"."addresses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"street" text NOT NULL,
	"number" varchar(10) NOT NULL,
	"neighborhood" text NOT NULL,
	"city" text NOT NULL,
	"state" varchar(2) NOT NULL,
	"zip_code" varchar(10) NOT NULL,
	"country" text DEFAULT '' NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "development"."carts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"attendant_id" uuid,
	"client_id" uuid,
	"address_id" uuid,
	"status" varchar(10) DEFAULT 'budget' NOT NULL,
	"created_at" integer NOT NULL,
	"ordered_at" integer,
	"expired_at" integer,
	"finished_at" integer,
	"canceled_at" integer,
	"shipped_at" integer,
	"processing_at" integer,
	"cancel_reason" text,
	"payment_method" text,
	"payment_change" integer,
	"contact_phone" varchar(15) NOT NULL,
	"channel" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "development"."clients" (
	"id" uuid PRIMARY KEY NOT NULL,
	"partner_id" text,
	"contact_phone" varchar(15),
	"address_id" uuid,
	"workspace_id" uuid
);
--> statement-breakpoint
CREATE TABLE "development"."contacts" (
	"phone" varchar(15) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"thumbnail" text
);
--> statement-breakpoint
CREATE TABLE "development"."conversations" (
	"id" uuid NOT NULL,
	"channel" text NOT NULL,
	"sector_id" uuid,
	"contact_phone" varchar(15),
	"attendant_id" uuid,
	"status" varchar(10) NOT NULL,
	"workspace_id" uuid NOT NULL,
	"opened_at" integer,
	"closed_at" integer,
	CONSTRAINT "conversations_contact_phone_channel_pk" PRIMARY KEY("contact_phone","channel"),
	CONSTRAINT "conversations_id_unique" UNIQUE("id")
);
--> statement-breakpoint
CREATE TABLE "development"."memberships" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"permissions" text[] DEFAULT '{}' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "development"."message_buffer" (
	"message_id" text PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"sender" text NOT NULL,
	"timestamp" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "development"."messages" (
	"id" text PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"created_at" integer NOT NULL,
	"viewed_at" integer,
	"type" varchar(10),
	"status" text DEFAULT 'senting' NOT NULL,
	"sender_type" varchar(10),
	"sender_name" text DEFAULT '' NOT NULL,
	"sender_id" text NOT NULL,
	"internal" boolean DEFAULT false NOT NULL,
	"contact_phone" varchar(15) NOT NULL,
	"channel" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "development"."products" (
	"id" text NOT NULL,
	"description" text NOT NULL,
	"code" text,
	"manufactory" text NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"embedding" vector(1536),
	"promotion_price" integer DEFAULT 0,
	"promotion_start" timestamp,
	"promotion_end" timestamp,
	"workspace_id" uuid,
	CONSTRAINT "products_id_workspace_id_pk" PRIMARY KEY("id","workspace_id")
);
--> statement-breakpoint
CREATE TABLE "development"."products_on_cart" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cart_id" uuid NOT NULL,
	"product_id" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"real_price" integer DEFAULT 0 NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "development"."sectors" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"workspace_id" uuid
);
--> statement-breakpoint
CREATE TABLE "development"."settings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"waba_id" text DEFAULT '' NOT NULL,
	"phone_id" text DEFAULT '' NOT NULL,
	"workspace_id" uuid NOT NULL,
	"attendant_name" text DEFAULT '' NOT NULL,
	"business_name" text DEFAULT '' NOT NULL,
	"location_available" text DEFAULT '' NOT NULL,
	"opening_hours" text DEFAULT '' NOT NULL,
	"payment_methods" text DEFAULT '' NOT NULL,
	"vector_namespace" text DEFAULT '' NOT NULL,
	"knowledge_base" text DEFAULT '' NOT NULL,
	"ai_enabled" boolean DEFAULT true NOT NULL,
	"queue_url" text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "development"."tools_results_buffer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"toolName" text NOT NULL,
	"contact" text NOT NULL,
	"channel" text NOT NULL,
	"content" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "development"."users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"email" text NOT NULL,
	"thumbnail" text DEFAULT '',
	"password" text DEFAULT '' NOT NULL,
	"sector_id" uuid,
	"type" varchar DEFAULT 'user' NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "development"."workspaces" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "development"."carts" ADD CONSTRAINT "carts_attendant_id_users_id_fk" FOREIGN KEY ("attendant_id") REFERENCES "development"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "development"."carts" ADD CONSTRAINT "carts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "development"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "development"."carts" ADD CONSTRAINT "carts_address_id_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "development"."addresses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "development"."carts" ADD CONSTRAINT "messages_conversation_fk" FOREIGN KEY ("contact_phone","channel") REFERENCES "development"."conversations"("contact_phone","channel") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "development"."clients" ADD CONSTRAINT "clients_contact_phone_contacts_phone_fk" FOREIGN KEY ("contact_phone") REFERENCES "development"."contacts"("phone") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "development"."clients" ADD CONSTRAINT "clients_address_id_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "development"."addresses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "development"."clients" ADD CONSTRAINT "clients_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "development"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "development"."conversations" ADD CONSTRAINT "conversations_sector_id_sectors_id_fk" FOREIGN KEY ("sector_id") REFERENCES "development"."sectors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "development"."conversations" ADD CONSTRAINT "conversations_contact_phone_contacts_phone_fk" FOREIGN KEY ("contact_phone") REFERENCES "development"."contacts"("phone") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "development"."conversations" ADD CONSTRAINT "conversations_attendant_id_users_id_fk" FOREIGN KEY ("attendant_id") REFERENCES "development"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "development"."conversations" ADD CONSTRAINT "conversations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "development"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "development"."memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "development"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "development"."memberships" ADD CONSTRAINT "memberships_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "development"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "development"."messages" ADD CONSTRAINT "messages_conversation_fk" FOREIGN KEY ("contact_phone","channel") REFERENCES "development"."conversations"("contact_phone","channel") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "development"."products" ADD CONSTRAINT "products_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "development"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "development"."products_on_cart" ADD CONSTRAINT "products_on_cart_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "development"."carts"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "development"."sectors" ADD CONSTRAINT "sectors_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "development"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "development"."settings" ADD CONSTRAINT "settings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "development"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "development"."users" ADD CONSTRAINT "users_sector_id_sectors_id_fk" FOREIGN KEY ("sector_id") REFERENCES "development"."sectors"("id") ON DELETE no action ON UPDATE no action;