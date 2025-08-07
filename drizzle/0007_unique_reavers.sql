ALTER TABLE "carts" DROP CONSTRAINT "carts_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "clients" DROP CONSTRAINT "clients_workspace_id_workspaces_id_fk";
--> statement-breakpoint
ALTER TABLE "carts" DROP COLUMN "workspace_id";--> statement-breakpoint
ALTER TABLE "clients" DROP COLUMN "workspace_id";