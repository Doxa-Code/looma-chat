ALTER TABLE "carts" DROP CONSTRAINT "carts_conversation_id_conversations_id_fk";
--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE cascade;