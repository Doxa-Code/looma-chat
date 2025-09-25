SET search_path TO development;

CREATE TABLE IF NOT EXISTS "addresses" (
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

CREATE TABLE IF NOT EXISTS "carts" (
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
	"conversation_id" uuid
);

CREATE TABLE IF NOT EXISTS "clients" (
	"id" uuid PRIMARY KEY NOT NULL,
	"partner_id" text,
	"contact_phone" varchar(15),
	"address_id" uuid,
	"workspace_id" uuid
);

CREATE TABLE IF NOT EXISTS "contacts" (
	"phone" varchar(15) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"thumbnail" text
);

CREATE TABLE IF NOT EXISTS "conversations" (
	"id" uuid NOT NULL,
	"channel" text NOT NULL,
	"sector_id" uuid,
	"contact_phone" varchar(15),
	"attendant_id" uuid,
	"status" varchar(10) NOT NULL,
	"workspace_id" uuid NOT NULL,
	"opened_at" integer,
	"closed_at" integer,
	CONSTRAINT "conversations_id_contact_phone_channel_pk" PRIMARY KEY("id","contact_phone","channel"),
	CONSTRAINT "conversations_id_unique" UNIQUE("id")
);

CREATE TABLE IF NOT EXISTS "memberships" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"permissions" text[] DEFAULT '{}' NOT NULL
);

CREATE TABLE IF NOT EXISTS "message_buffer" (
	"message_id" text PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"sender" text NOT NULL,
	"timestamp" integer NOT NULL
);

CREATE TABLE IF NOT EXISTS "messages" (
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
	"conversation_id" uuid
);

CREATE TABLE IF NOT EXISTS "products" (
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

CREATE TABLE IF NOT EXISTS "products_on_cart" (
	"id" uuid PRIMARY KEY NOT NULL,
	"cart_id" uuid NOT NULL,
	"product_id" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price" integer DEFAULT 0 NOT NULL,
	"real_price" integer DEFAULT 0 NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL
);

CREATE TABLE IF NOT EXISTS "sectors" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"workspace_id" uuid
);

CREATE TABLE IF NOT EXISTS "settings" (
	"id" uuid PRIMARY KEY NOT NULL,
	"access_token" text DEFAULT '' NOT NULL,
	"waba_id" text DEFAULT '' NOT NULL,
	"phone_id" text DEFAULT '' NOT NULL,
	"workspace_id" uuid NOT NULL,
	"attendant_name" text DEFAULT '' NOT NULL,
	"business_name" text DEFAULT '' NOT NULL,
	"location_available" text DEFAULT '' NOT NULL,
	"opening_hours" text DEFAULT '' NOT NULL,
	"payment_methods" text DEFAULT '' NOT NULL,
	"knowledge_base" text DEFAULT '' NOT NULL,
	"ai_enabled" boolean DEFAULT true NOT NULL,
	"queue_url" text DEFAULT '' NOT NULL
);

CREATE TABLE IF NOT EXISTS "tools_results_buffer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"toolName" text NOT NULL,
	"contact" text NOT NULL,
	"channel" text NOT NULL,
	"content" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"email" text NOT NULL,
	"thumbnail" text DEFAULT '',
	"password" text DEFAULT '' NOT NULL,
	"sector_id" uuid,
	"type" varchar DEFAULT 'user' NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE IF NOT EXISTS "workspaces" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL
);

-- =========================
-- Foreign Keys (com IF NOT EXISTS)
-- =========================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'carts_attendant_id_users_id_fk') THEN
        ALTER TABLE "carts" 
        ADD CONSTRAINT "carts_attendant_id_users_id_fk" FOREIGN KEY ("attendant_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'carts_client_id_clients_id_fk') THEN
        ALTER TABLE "carts" 
        ADD CONSTRAINT "carts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'carts_address_id_addresses_id_fk') THEN
        ALTER TABLE "carts" 
        ADD CONSTRAINT "carts_address_id_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "addresses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'carts_conversation_id_conversations_id_fk') THEN
        ALTER TABLE "carts" 
        ADD CONSTRAINT "carts_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clients_contact_phone_contacts_phone_fk') THEN
        ALTER TABLE "clients" 
        ADD CONSTRAINT "clients_contact_phone_contacts_phone_fk" FOREIGN KEY ("contact_phone") REFERENCES "contacts"("phone") ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clients_address_id_addresses_id_fk') THEN
        ALTER TABLE "clients" 
        ADD CONSTRAINT "clients_address_id_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "addresses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clients_workspace_id_workspaces_id_fk') THEN
        ALTER TABLE "clients" 
        ADD CONSTRAINT "clients_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversations_sector_id_sectors_id_fk') THEN
        ALTER TABLE "conversations" 
        ADD CONSTRAINT "conversations_sector_id_sectors_id_fk" FOREIGN KEY ("sector_id") REFERENCES "sectors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversations_contact_phone_contacts_phone_fk') THEN
        ALTER TABLE "conversations" 
        ADD CONSTRAINT "conversations_contact_phone_contacts_phone_fk" FOREIGN KEY ("contact_phone") REFERENCES "contacts"("phone") ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversations_attendant_id_users_id_fk') THEN
        ALTER TABLE "conversations" 
        ADD CONSTRAINT "conversations_attendant_id_users_id_fk" FOREIGN KEY ("attendant_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'conversations_workspace_id_workspaces_id_fk') THEN
        ALTER TABLE "conversations" 
        ADD CONSTRAINT "conversations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memberships_user_id_users_id_fk') THEN
        ALTER TABLE "memberships" 
        ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'memberships_workspace_id_workspaces_id_fk') THEN
        ALTER TABLE "memberships" 
        ADD CONSTRAINT "memberships_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_conversation_id_conversations_id_fk') THEN
        ALTER TABLE "messages" 
        ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_workspace_id_workspaces_id_fk') THEN
        ALTER TABLE "products" 
        ADD CONSTRAINT "products_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_on_cart_cart_id_carts_id_fk') THEN
        ALTER TABLE "products_on_cart" 
        ADD CONSTRAINT "products_on_cart_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sectors_workspace_id_workspaces_id_fk') THEN
        ALTER TABLE "sectors" 
        ADD CONSTRAINT "sectors_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'settings_workspace_id_workspaces_id_fk') THEN
        ALTER TABLE "settings" 
        ADD CONSTRAINT "settings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_sector_id_sectors_id_fk') THEN
        ALTER TABLE "users" 
        ADD CONSTRAINT "users_sector_id_sectors_id_fk" FOREIGN KEY ("sector_id") REFERENCES "sectors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
    END IF;
END$$;


