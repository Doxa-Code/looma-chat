ALTER TABLE "users" ALTER COLUMN "email" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");