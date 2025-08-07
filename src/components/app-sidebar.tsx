"use client";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { User } from "@/core/domain/entities/user";
import {
  Box,
  ChevronRight,
  CogIcon,
  DollarSign,
  Dot,
  MessageCircle,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";
import { WorkspaceDropdown } from "./workspace-dropdown";

const navMain = [
  {
    title: "Chat",
    url: "/chat",
    icon: MessageCircle,
  },
  {
    title: "Vendas",
    url: "/sales",
    icon: DollarSign,
  },
  {
    title: "Produtos",
    url: "/products",
    icon: Box,
  },
  {
    title: "Configurações",
    url: "#",
    childrens: [
      {
        title: "Geral",
        url: "/settings",
      },
      {
        title: "Usuários",
        url: "/settings/users",
      },
      {
        title: "Áreas de trabalho",
        url: "/settings/workspaces",
      },
    ],
    icon: CogIcon,
  },
];

export function AppSidebar(
  props: React.ComponentProps<typeof Sidebar> & {
    user: User.Raw;
    workspaceSelected: {
      workspaces: { id: string; name: string }[];
      workspace: { id: string; name: string };
    };
  }
) {
  const pathname = usePathname();
  const { open } = useSidebar();
  return (
    <Sidebar collapsible="icon" className="bg-white" {...props}>
      <SidebarHeader className="border-b h-auto mb-5">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="hover:bg-transparent"
            >
              <div className="flex justify-between items-center">
                <div
                  data-open={open}
                  className="w-full max-w-[80px] data-[open=false]:mx-auto"
                >
                  <Image
                    alt="Logo"
                    width={1000}
                    height={1000}
                    src={open ? "/logo.png" : "/icon.png"}
                  />
                </div>

                <SidebarTrigger data-hidden={!open} className="-ml-1" />
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <WorkspaceDropdown {...props.workspaceSelected} />
      </SidebarHeader>
      <SidebarContent className="gap-1">
        <span className="px-6 mb-2 text-muted-foreground uppercase text-xs">
          Menu
        </span>
        {navMain.map((item) => {
          const isActive = Boolean(pathname === item.url);
          return (
            <Collapsible
              key={item.title}
              title={item.title}
              className="group/collapsible"
            >
              <SidebarGroup className="px-4">
                <SidebarGroupLabel
                  asChild
                  data-active={isActive}
                  className="group/label data-[active=true]:bg-primary cursor-pointer text-sidebar-foreground rounded-md hover:bg-sidebar-accent hover:pl-6 hover:transition-all hover:duration-100 duration-100 transition-all hover:text-sidebar-accent-foreground text-sm px-2 py-2 h-auto"
                >
                  <Link
                    className="w-full select-none cursor-pointer"
                    href={item.url}
                  >
                    <CollapsibleTrigger className="flex items-center w-full gap-3">
                      <item.icon className="size-5 stroke-1 stroke-[#9CA3AF] group-data-[active=true]/label:stroke-white" />
                      <span className="text-[#212C3A] font-light group-data-[active=true]/label:text-white">
                        {item.title}
                      </span>
                      <ChevronRight
                        data-hidden={!item.childrens?.length}
                        className="ml-auto stroke-muted-foreground transition-transform size-4 group-data-[state=open]/collapsible:rotate-90"
                      />
                    </CollapsibleTrigger>
                  </Link>
                </SidebarGroupLabel>
                <CollapsibleContent data-hidden={!item.childrens?.length}>
                  <SidebarGroupContent className="px-1.5 md:px-0">
                    <SidebarMenu className="gap-1 pt-1">
                      {item.childrens?.map((item) => {
                        const isActive = Boolean(pathname === item.url);
                        return (
                          <Link key={item.title} href={item.url}>
                            <SidebarMenuItem>
                              <SidebarMenuButton
                                isActive={isActive}
                                data-active={isActive}
                                className="group data-[active=true]:bg-primary !h-auto hover:pl-6 cursor-pointer px-4"
                              >
                                <Dot className="size-4 group-data-[active=true]:stroke-white stroke-1.5 stroke-muted-foreground" />
                                <span className="font-normal text-muted-foreground group-data-[active=true]:text-white">
                                  {item.title}
                                </span>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          </Link>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}
      </SidebarContent>
      <SidebarFooter className="p-0">
        <NavUser user={props.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
