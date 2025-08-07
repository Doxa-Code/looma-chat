import { listWorkspaces } from "@/app/actions/users";
import { RegisterWorkspace } from "@/components/register-workspace";
import { TitlePage } from "@/components/title-page";
import { Card } from "@/components/ui/card";
import { Divider } from "@/components/ui/divider";
import { Label } from "@/components/ui/label";

export default async function WorkspacePage() {
  const [data] = await listWorkspaces({});
  return (
    <>
      <header className="pt-6 px-6">
        <TitlePage>Área de trabalho</TitlePage>
      </header>
      <main className="p-6">
        <Card className="p-6">
          <div className="block md:flex md:items-center justify-end">
            <RegisterWorkspace />
          </div>
          <Divider />
          <div className="grid gap-2 grid-cols-6">
            {(data?.workspaces ?? []).map((workspace) => (
              <Card
                key={workspace.id}
                className="rounded-md flex justify-between items-center px-4 py-6 dark:border-gray-800"
              >
                <Label>{workspace.name}</Label>
              </Card>
            ))}
          </div>
        </Card>
      </main>
    </>
  );
}
