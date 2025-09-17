BEGIN;

-- 1. ADICIONAR NOVAS COLUNAS EM CARTS E MESSAGES
ALTER TABLE "carts" ADD COLUMN "contact_phone" TEXT DEFAULT '';
ALTER TABLE "carts" ADD COLUMN "channel" TEXT DEFAULT '';

ALTER TABLE "messages" ADD COLUMN "contact_phone" TEXT DEFAULT '';
ALTER TABLE "messages" ADD COLUMN "channel" TEXT DEFAULT '';

-- 2. POPULAR AS NOVAS COLUNAS BASEADAS EM conversations.id
UPDATE carts
SET contact_phone = conversations.contact_phone,
    channel = conversations.channel
FROM conversations
WHERE carts.conversation_id = conversations.id;

UPDATE messages
SET contact_phone = conversations.contact_phone,
    channel = conversations.channel
FROM conversations
WHERE messages.conversation_id = conversations.id;

-- 3. REMOVER DEFAULTS E DEFINIR COMO NOT NULL
ALTER TABLE "carts" ALTER COLUMN "contact_phone" DROP DEFAULT;
ALTER TABLE "carts" ALTER COLUMN "channel" DROP DEFAULT;
ALTER TABLE "carts" ALTER COLUMN "contact_phone" SET NOT NULL;
ALTER TABLE "carts" ALTER COLUMN "channel" SET NOT NULL;

ALTER TABLE "messages" ALTER COLUMN "contact_phone" DROP DEFAULT;
ALTER TABLE "messages" ALTER COLUMN "channel" DROP DEFAULT;
ALTER TABLE "messages" ALTER COLUMN "contact_phone" SET NOT NULL;
ALTER TABLE "messages" ALTER COLUMN "channel" SET NOT NULL;

-- 4. REMOVER FKs ANTIGAS BASEADAS EM conversations.id
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT con.conname, con.conrelid::regclass
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE con.confrelid = 'conversations'::regclass
          AND con.contype = 'f'
    LOOP
        EXECUTE 'ALTER TABLE ' || r.conrelid || ' DROP CONSTRAINT ' || r.conname;
    END LOOP;
END$$;

-- 5. REMOVER PK ANTIGA E CRIAR PK COMPOSTA
ALTER TABLE "conversations" DROP CONSTRAINT IF EXISTS conversations_pkey;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_contact_phone_channel_pk" PRIMARY KEY("contact_phone", "channel");

-- 6. CRIAR NOVAS FOREIGN KEYS PARA CARTS E MESSAGES
ALTER TABLE "carts"
ADD CONSTRAINT "carts_contact_phone_channel_fk"
FOREIGN KEY ("contact_phone", "channel")
REFERENCES "conversations" ("contact_phone", "channel")
ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "messages"
ADD CONSTRAINT "messages_contact_phone_channel_fk"
FOREIGN KEY ("contact_phone", "channel")
REFERENCES "conversations" ("contact_phone", "channel")
ON UPDATE CASCADE ON DELETE CASCADE;

COMMIT;
