"use client";
import { registerMeAttendant } from "@/app/actions/conversations";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatLastMessagemTime } from "@/lib/utils";
import { Conversation } from "@looma/core/domain/entities/conversation";
import { User } from "@looma/core/domain/entities/user";
import { User2 } from "lucide-react";
import React, { useMemo } from "react";
import { useServerAction } from "zsa-react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { TimeCounter } from "./timer-counter";

type Props = {
  isConnected: boolean;
  conversations: Conversation.Raw[];
  selectConversation(conversation: Conversation.Raw): void;
  registerMe(conversationId: string): void;
  conversation: Conversation.Raw | null;
  user: User.Raw;
};

export const ChatSidebar: React.FC<Props> = (props) => {
  const [filter, setFilter] = React.useState<"inbox" | "my">("inbox");

  const registerMeAttendantAction = useServerAction(registerMeAttendant);

  const conversations = useMemo(
    () =>
      props.conversations
        .sort((a, b) =>
          a.lastMessage?.createdAt! > b.lastMessage?.createdAt! ? -1 : 1
        )
        .filter((c) => {
          if (filter === "my") return c.attendant?.id === props.user.id;
          return true;
        }),
    [filter, props.conversations, props.user.id]
  );

  const myConversationsCount = useMemo(
    () =>
      props.conversations.filter((c) => c.attendant?.id === props.user.id)
        .length,
    [props.conversations, props.user.id]
  );

  const inboxConversationCount = useMemo(
    () => props.conversations.length,
    [props.conversations]
  );

  return (
    <Sidebar
      collapsible="none"
      className="hidden bg-white border-r flex-1 max-w-[25rem] w-full md:flex"
    >
      <SidebarHeader className="gap-3.5 pt-4 pb-0 px-0">
        <div className="flex items-center justify-between px-4 pb-2">
          <h1 className="text-xl font-semibold text-[#0A0A0A]">Atendimentos</h1>
        </div>
        <Tabs
          defaultValue={filter}
          onValueChange={(value) => setFilter(value as "inbox" | "my")}
          className="px-0 overflow-x-auto scrollbar-track-transparent scrollbar-thin scrollbar-thumb-transparent"
        >
          <TabsList variant="line" className="border-b mx-0">
            <TabsTrigger value="inbox" className="flex items-center gap-2">
              <span>Inbox</span>
              <Badge className="!rounded group-data-[state=active]:text-[#0073E2] group-data-[state=active]:bg-[#EBF2FE] bg-[#F4F4F4] text-[#84868D]">
                {inboxConversationCount}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="my" className="flex items-center gap-2">
              <span>Meus Atendimentos</span>
              <Badge className="!rounded group-data-[state=active]:text-[#0073E2] group-data-[state=active]:bg-[#EBF2FE] bg-[#F4F4F4] text-[#84868D]">
                {myConversationsCount}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup className="px-0">
          <SidebarGroupContent className="bg-white">
            {conversations.map((c) => {
              const hasMessageToView = c.lastContactMessages.filter(
                (m) => !m.viewedAt
              );
              const hasAttendant = !!c.attendant?.id;
              return (
                <div
                  key={c.id}
                  data-active={c.id === props.conversation?.id}
                  onClick={() => {
                    props.selectConversation(c);
                  }}
                  className="hover:bg-sidebar-accent data-[active=true]:bg-primary/10 min-h-[86px] cursor-pointer hover:text-sidebar-accent-foreground flex items-center gap-3 border-b px-4 py-2 text-sm leading-tight whitespace-nowrap"
                >
                  <div>
                    <Avatar className="h-10 w-10 bg-white border">
                      <AvatarImage src={c.contact?.thumbnail ?? ""} />
                      <AvatarFallback className="border">
                        <User2 className="stroke-1 size-5" />
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex flex-col justify-between w-full gap-1">
                    <div className="flex w-full justify-between items-center">
                      <span className="select-none text-[#171616]">
                        {c.contact?.name}
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
                  <div className="flex flex-col gap-2">
                    <span className="text-muted-foreground font-light select-none !text-[10px]">
                      {c.lastMessage &&
                        formatLastMessagemTime(c?.lastMessage?.createdAt)}
                    </span>

                    {!!hasMessageToView.length && (
                      <div>
                        <Badge className="bg-[#1DAA61] text-xs rounded-full w-5 h-5 p-2">
                          {hasMessageToView.length}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div
                    className="flex gap-2 py-2 flex-col"
                    data-hidden={hasAttendant}
                  >
                    <TimeCounter startDate={c.lastMessage?.createdAt!} />
                    <Button
                      onClick={async () => {
                        props.registerMe(c.id);
                        await registerMeAttendantAction.execute({
                          conversationId: c.id,
                        });
                      }}
                      className="text-xs rounded gap-2 flex items-center justify-center"
                    >
                      Atender
                    </Button>
                  </div>
                </div>
              );
            })}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
