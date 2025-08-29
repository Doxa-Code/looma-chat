CREATE TABLE "message_buffer" (
	"message_id" text PRIMARY KEY NOT NULL,
	"content" jsonb NOT NULL,
	"sender" text NOT NULL,
	"timestamp" integer NOT NULL
);
