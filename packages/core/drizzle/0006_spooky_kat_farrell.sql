ALTER TABLE "carts" ADD COLUMN "workspace_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "workspace_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;