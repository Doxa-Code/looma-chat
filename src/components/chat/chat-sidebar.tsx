import React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Input } from "../ui/input";
import { Conversation } from "@/core/domain/entities/conversation";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { User2 } from "lucide-react";
import { formatLastMessagemTime } from "@/lib/utils";

type Props = {
  isConnected: boolean;
  conversations: Conversation.Raw[];
  selectConversation(conversation: Conversation.Raw): void;
  conversation: Conversation.Raw | null;
};

export const ChatSidebar: React.FC<Props> = (props) => {
  return (
    <Sidebar
      collapsible="none"
      className="hidden bg-white border-r flex-1 max-w-[352px] md:flex"
    >
      <SidebarHeader className="gap-3.5 border-b p-4">
        <div className="flex items-center justify-between">
          <h1 className="font-medium">Atendimentos</h1>
          <div
            data-connected={props.isConnected}
            className="relative shadow rounded-full group flex justify-center items-center"
          >
            <div className="w-3 h-3 group-data-[connected=true]:bg-emerald-500 bg-rose-500 rounded-full" />
            <div className="absolute group-data-[connected=true]:bg-emerald-500 opacity-10 w-5 h-5 bg-rose-600 rounded-full" />
          </div>
        </div>
        <Input
          type="search"
          placeholder="Pesquisar..."
          className="shadow-none text-black text-xs border-none ring-0 focus-visible:ring-0"
        />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="px-0">
          <SidebarGroupContent className="bg-white">
            {props.conversations.map((c) => (
              <div
                key={c.id}
                data-active={c.id === props.conversation?.id}
                onClick={() => {
                  props.selectConversation(c);
                }}
                className="hover:bg-sidebar-accent data-[active=true]:bg-primary/10 cursor-pointer hover:text-sidebar-accent-foreground flex items-center gap-2 border-b p-4 text-sm leading-tight whitespace-nowrap"
              >
                <div>
                  <Avatar className="h-13 w-13 bg-white border">
                    <AvatarImage src={c.contact?.thumbnail ?? ""} />
                    <AvatarFallback className="border">
                      <User2 className="stroke-1 size-5" />
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex flex-col justify-between w-full gap-1">
                  <div className="flex w-full justify-between items-center">
                    <span className="font-semibold select-none">
                      {c.contact?.name}
                    </span>
                    <span className="text-muted-foreground select-none !text-[10px]">
                      {c.lastMessage &&
                        formatLastMessagemTime(c?.lastMessage?.createdAt)}
                    </span>
                  </div>
                  <span
                    data-unviewed={
                      c.lastMessage?.status !== "viewed" &&
                      c.lastMessage?.sender?.type === "contact"
                    }
                    className="line-clamp-1 truncate whitespace-normal data-[unviewed=true]:font-bold text-muted-foreground text-xs"
                  >
                    {c.teaser}
                  </span>
                </div>
              </div>
            ))}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
