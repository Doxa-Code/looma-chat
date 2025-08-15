"use client";
import { changeWorkspace, listWorkspaces } from "@/app/actions/users";
import {
  useServerActionMutation,
  useServerActionQuery,
} from "@/hooks/server-action-hooks";
import { cx } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import { useMemo } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { SidebarMenuButton } from "./ui/sidebar";

type Props = {
  workspaces: { id: string; name: string }[];
  workspace: { id: string; name: string };
  onSelected(): void;
};

export const WorkspaceDropdown = (props: Props) => {
  const changeWorkspaceAction = useServerActionMutation(changeWorkspace, {
    onSuccess() {
      window.location.reload();
    },
  });
  const { data } = useServerActionQuery(listWorkspaces, {
    input: undefined,
    queryKey: ["list-workspaces"],
    initialData: {
      workspace: props.workspace,
      workspaces: props.workspaces,
    },
  });

  const workspace = useMemo(() => data?.workspace, [data]);
  const workspaces = useMemo(() => data?.workspaces ?? [], [data]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-muted border rounded mx-auto data-[state=open]:text-sidebar-accent-foreground cursor-pointer hover:opacity-80 md:h-auto py-3 outline-0 ring-0 data-[state=collapsed]:px-0 px-2"
        >
          <span
            className={cx(
              "bg-primary",
              "flex size-6 shrink-0 items-center justify-center rounded-full text-xs text-white dark:text-white"
            )}
            aria-hidden="true"
          >
            {workspace?.name
              ?.split(" ")
              ?.map((word) => word[0])
              ?.filter((_, i) => i < 2)
              ?.join("")}
          </span>
          <div className="grid flex-1 text-left  leading-tight">
            <span className="truncate font-medium text-xs">
              {workspace?.name}
            </span>
          </div>
          <ChevronsUpDown />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
        side="bottom"
        align="end"
        sideOffset={4}
      >
        {workspaces.map((w) => {
          const isSelected = data.workspace.id === w.id;
          return (
            <DropdownMenuItem
              className="flex items-center justify-between"
              key={w.id}
              onClick={() => {
                props.onSelected();
                changeWorkspaceAction.mutate({
                  workspaceId: w.id,
                  pathname: window.location.pathname,
                });
              }}
            >
              <span className="text-xs">{w.name}</span>
              <Check data-hidden={!isSelected} />
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
