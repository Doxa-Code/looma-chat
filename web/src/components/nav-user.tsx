"use client";

import { ChevronsUpDown, LogOut, User2 } from "lucide-react";

import { signOut } from "@/app/actions/users";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useServerAction } from "zsa-react";
import { User } from "@/core/domain/entities/user";

export function NavUser({ user }: { user?: User.Raw }) {
  const { isMobile } = useSidebar();
  const signOutAction = useServerAction(signOut);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-muted mx-auto rounded-none data-[state=open]:text-sidebar-accent-foreground cursor-pointer hover:opacity-80 md:h-auto py-5 outline-0 ring-0 data-[state=collapsed]:px-0 bg-muted px-2"
            >
              <Avatar className="h-10 w-10 bg-primary/80 border">
                <AvatarFallback className="rounded-lg bg-transparent">
                  <User2 className="stroke-1 stroke-white" />
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left  leading-tight">
                <span className="truncate font-medium text-xs">
                  {user?.name}
                </span>
                <span className="truncate !text-xs font-light">
                  {user?.email}
                </span>
              </div>
              <ChevronsUpDown />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg border">
                  <AvatarFallback className="rounded-lg">
                    <User2 className="stroke-1 stroke-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left">
                  <span className="truncate font-medium">{user?.name}</span>
                  <span className="truncate font-light">{user?.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOutAction.execute()}>
              <LogOut />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
