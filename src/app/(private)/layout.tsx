import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { getUserAuthenticate } from "../actions/security";
import { listWorkspaces } from "../actions/users";

export default async function PrivateRootLayout(
  props: React.PropsWithChildren
) {
  const [user] = await getUserAuthenticate();
  const [workspaces] = await listWorkspaces({});
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "250px",
        } as React.CSSProperties
      }
    >
      <AppSidebar workspaceSelected={workspaces!} user={user?.raw?.()!} />
      <main className="w-full h-screen overflow-hidden flex flex-col bg-[#F9FAFC]">
        {props.children}
      </main>
    </SidebarProvider>
  );
}
