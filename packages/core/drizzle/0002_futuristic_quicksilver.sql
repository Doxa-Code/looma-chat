--> statement-breakpoint
ALTER TABLE "development"."messages" ADD COLUMN "conversation_id" uuid;--> statement-breakpoint
ALTER TABLE "development"."messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "development"."conversations"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "development"."messages" DROP COLUMN "contact_phone" CASCADE;--> statement-breakpoint
ALTER TABLE "development"."messages" DROP COLUMN "channel" CASCADE;