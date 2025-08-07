"use client";

import { markLastMessagesContactAsViewed } from "@/app/actions/conversations";
import { Conversation } from "@/core/domain/entities/conversation";
import { Message } from "@/core/domain/entities/message";
import { useServerActionMutation } from "@/hooks/server-action-hooks";
import { useSSE } from "@/hooks/use-sse";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useRef, useState } from "react";
import { ChatEmptyContainer } from "./chat-empty-container";
import { ChatForm } from "./chat-form";
import { ChatHeader } from "./chat-header";
import { ChatSidebar } from "./chat-sidebar";
import { ContainerMessages } from "./container-messages";
import { User } from "@/core/domain/entities/user";
import { Logo } from "../logo";

type Props = {
  conversations: Conversation.Raw[];
  userAuthenticated: User.Raw;
};

export function Chat(props: Props) {
  const containerMessages = useRef<HTMLDivElement>(null);
  const [conversations, setConversations] = useState<
    Map<string, Conversation.Raw>
  >(new Map(props.conversations.map((c) => [c.id, c])));
  const [conversation, setConversation] = useState<Conversation.Raw | null>(
    null
  );
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState<Message.Raw[]>([]);
  const markLastMessagesContactAsViewedAction = useServerActionMutation(
    markLastMessagesContactAsViewed
  );
  const { toast } = useToast();
  const { connected } = useSSE({
    url: "/api/sse",
    onError(err) {
      toast({
        variant: "error",
        title: "Error",
        description: err.message,
      });
    },
    onMessage({ type, data: message }) {
      if (type === "typing") {
        setTyping(true);
        return;
      }

      if (type === "untyping") {
        setTyping(false);
        return;
      }

      const newConversation = message as Conversation.Raw;

      if (!newConversation.id) return;

      setConversations((conversations) => {
        conversations.set(newConversation.id, {
          ...newConversation,
          lastMessage: newConversation.lastMessage
            ? {
                ...newConversation.lastMessage,
                createdAt: new Date(newConversation.lastMessage?.createdAt),
              }
            : undefined,
          openedAt: newConversation.openedAt
            ? new Date(newConversation.openedAt)
            : null,
          messages: newConversation.messages.map((m) => ({
            ...m,
            createdAt: new Date(m.createdAt),
            viewedAt: m.viewedAt ? new Date(m.viewedAt) : null,
          })),
        });
        return new Map(Array.from(conversations.entries()));
      });

      if (conversation?.id === newConversation.id) {
        setConversation(newConversation);
      }
    },
  });

  console.log(connected);

  useEffect(() => {
    if (conversation?.id) {
      setConversation(conversations.get(conversation.id) ?? null);
    }
  }, [conversations]);

  useEffect(() => {
    setMessages(conversation?.messages ?? []);

    if (
      conversation?.messages.some(
        (m) => m.status !== "viewed" && m.sender.type === "contact"
      )
    ) {
      markLastMessagesContactAsViewedAction.mutate({
        conversationId: conversation.id,
      });
    }
  }, [conversation]);

  useEffect(() => {
    if (containerMessages.current) {
      setTimeout(() => {
        containerMessages.current?.scrollBy({
          top: containerMessages.current.scrollHeight,
        });
      }, 100);
    }
  }, [messages]);

  if (!connected) {
    return (
      <div className="fixed w-full h-screen top-0 left-0 flex justify-center items-center flex-col bg-white/80 z-50">
        <Logo className="size-20 motion-preset-stretch " />
        <span className="animate-pulse">Carregando atendimentos...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-1 w-full border overflow-hidden rounded-md shadow">
      <ChatSidebar
        conversation={conversation}
        conversations={Array.from(conversations.values())}
        isConnected={connected}
        selectConversation={setConversation}
      />
      <ChatEmptyContainer hidden={!!conversation} />
      <div
        data-hidden={!conversation}
        className="flex flex-col overflow-hidden bg-[#E2DFE8]/30 gap-4 w-full flex-1 relative"
      >
        <ChatHeader contact={conversation?.contact} />
        <ContainerMessages
          ref={containerMessages}
          messages={messages}
          channel={conversation?.channel!}
          typing={typing}
        />
        <ChatForm
          conversationId={conversation?.id}
          addMessage={(message) => {
            setMessages((messages) => [...messages, message]);
          }}
          channel={conversation?.channel!}
          userAuthenticated={props.userAuthenticated}
        />
      </div>
    </div>
  );
}
