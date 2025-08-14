import { listWorkspaces } from "@/app/actions/users";
import { ButtonCopyIdWorkspace } from "@/components/button-copy-id-workspace";
import { RegisterWorkspace } from "@/components/register-workspace";
import { TitlePage } from "@/components/title-page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Divider } from "@/components/ui/divider";
import { Label } from "@/components/ui/label";
import { Copy } from "lucide-react";

export default async function WorkspacePage() {
  const [data] = await listWorkspaces({});
  return (
    <>
      <header className="pt-6 px-6">
        <TitlePage>Áreas de trabalho</TitlePage>
      </header>
      <main className="p-6">
        <Card className="p-6">
          <div className="block md:flex md:items-center justify-end">
            <RegisterWorkspace />
          </div>
          <Divider />
          <div className="grid gap-2 grid-cols-1">
            {(data?.workspaces ?? []).map((workspace) => (
              <Card
                key={workspace.id}
                className="rounded-md flex justify-between items-center px-4 py-6 dark:border-gray-800"
              >
                <div className="flex flex-col gap-2">
                  <Label>{workspace.name}</Label>
                  <span className="text-xs text-muted-foreground font-light">
                    {workspace.id}
                  </span>
                </div>
                <ButtonCopyIdWorkspace workspaceId={workspace.id} />
              </Card>
            ))}
          </div>
        </Card>
      </main>
    </>
  );
}
