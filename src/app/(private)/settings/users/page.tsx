import { listUsers } from "@/app/actions/users";
import { ContainerPage } from "@/components/container-page";
import TableUsers from "@/components/table-users";
import { TitlePage } from "@/components/title-page";

export default async function UsersPage() {
  const [users] = await listUsers();
  return (
    <ContainerPage>
      <TitlePage>Usuários</TitlePage>
      <div className="rounded-md border flex-1 bg-white p-8">
        <TableUsers users={users ?? []} />
      </div>
    </ContainerPage>
  );
}
