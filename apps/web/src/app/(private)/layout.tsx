import { AppSidebar } from "@/components/app-sidebar";
import { NavUser } from "@/components/nav-user";
import { SidebarProvider } from "@/components/ui/sidebar";
import { MembershipsDatabaseRepository } from "@looma/core/infra/repositories/membership-repository";
import { getUserAuthenticate } from "../actions/security";
import { listWorkspaces } from "../actions/users";

const membershipsRepository = MembershipsDatabaseRepository.instance();

export default async function PrivateRootLayout(
  props: React.PropsWithChildren
) {
  const [user] = await getUserAuthenticate();
  const [workspaces] = await listWorkspaces();
  const membership = await membershipsRepository.retrieveByUserIdAndWorkspaceId(
    user?.id!,
    workspaces?.workspace?.id!
  );
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "250px",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        permissions={membership?.permissions ?? []}
        workspaceSelected={workspaces!}
        user={user?.raw?.()!}
      />
      <main className="w-full h-screen overflow-auto flex flex-col bg-[#F9FAFC]">
        <header className="flex border-b shadow h-auto justify-end items-center  w-full bg-white">
          <NavUser user={user?.raw()} />
        </header>
        {props.children}
      </main>
    </SidebarProvider>
  );
}
