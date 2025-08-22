import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { getUserAuthenticate } from "../actions/security";
import { listWorkspaces } from "../actions/users";
import { MembershipsDatabaseRepository } from "@looma/core/infra/repositories/membership-repository";

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
        {props.children}
      </main>
    </SidebarProvider>
  );
}
