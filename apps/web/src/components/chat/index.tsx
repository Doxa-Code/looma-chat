"use client";

import { listAllConversations } from "@/app/actions/conversations";
import { markLastMessagesContactAsViewed } from "@/app/actions/messages";
import {
  useServerActionMutation,
  useServerActionQuery,
} from "@/hooks/server-action-hooks";
import { useSSE } from "@/hooks/use-sse";
import { useToast } from "@/hooks/use-toast";
import { Conversation } from "@looma/core/domain/entities/conversation";
import { Message } from "@looma/core/domain/entities/message";
import { User } from "@looma/core/domain/entities/user";
import { useEffect, useRef, useState } from "react";
import { Logo } from "../logo";
import { ChatEmptyContainer } from "./chat-empty-container";
import { ChatForm } from "./chat-form";
import { ChatHeader } from "./chat-header";
import { ChatSidebar } from "./chat-sidebar";
import { ContainerMessages } from "./container-messages";
import { ModalCart } from "./modal-cart";
import { Attendant } from "@looma/core/domain/value-objects/attendant";

type Props = {
  conversations: Conversation.Raw[];
  userAuthenticated: User.Raw;
  channel: string;
};

export function Chat(props: Props) {
  const [conversation, setConversation] = useState<Conversation.Raw | null>(
    null
  );
  const containerMessages = useRef<HTMLDivElement>(null);
  const { data } = useServerActionQuery(listAllConversations, {
    input: undefined,
    queryKey: ["list-conversations"],
  });
  const [conversations, setConversations] = useState<
    Map<string, Conversation.Raw>
  >(new Map(props.conversations.map((c) => [c.id, c])));
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState<Message.Raw[]>([]);
  const markLastMessagesContactAsViewedAction = useServerActionMutation(
    markLastMessagesContactAsViewed,
    {
      onSuccess(data) {
        setConversation(data);

        setConversations((prev) => {
          prev.set(data.id, data);
          return new Map(prev);
        });
      },
    }
  );
  const { toast } = useToast();
  const { connected } = useSSE({
    url: "/api/sse",
    onError(err) {
      if (err.message) {
        toast({
          variant: "error",
          title: "Error",
          description: err.message,
        });
      }
    },
    onMessage({ type, data: message }) {
      if (
        type === "typing" &&
        conversation?.messages.map((m) => m.id).includes(message.messageId)
      ) {
        setTyping(true);
        return;
      }

      if (type === "untyping" && message.id === conversation?.id) {
        setTyping(false);
        return;
      }

      if (type === "conversation") {
        const newConversation = message as Conversation.Raw;

        if (!newConversation.id || newConversation.channel !== props.channel)
          return;

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
      }
    },
  });

  useEffect(() => {
    if (conversation?.id) {
      setConversation(conversations.get(conversation.id) ?? null);
    }
  }, [conversations]);

  useEffect(() => {
    if (data?.length) {
      setConversations(new Map(data?.map((c) => [c.id, c])));
    }
  }, [data]);

  useEffect(() => {
    setMessages(conversation?.messages ?? []);

    if (
      conversation?.messages.some(
        (m) => m.status !== "viewed" && m.sender?.type === "contact"
      ) &&
      conversation.attendant?.id === props.userAuthenticated.id
    ) {
      markLastMessagesContactAsViewedAction.mutate({
        channel: conversation.channel,
        contactPhone: conversation.contact.phone,
      });
      const lastConversation = Conversation.fromRaw(conversation);
      lastConversation.markAllMessageAsViewed();
      setConversation(lastConversation.raw());
      setConversations((prev) => {
        prev.set(lastConversation.id, lastConversation.raw());
        return new Map(prev);
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setConversation(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (!connected) {
    return (
      <div className="fixed w-full h-screen top-0 left-0 flex justify-center items-center flex-col bg-white/80 z-50">
        <Logo className="size-20 motion-preset-stretch " />
        <span className="animate-pulse">Carregando atendimentos...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-1 w-full overflow-hidden rounded-none">
      <ChatSidebar
        conversation={conversation}
        conversations={Array.from(conversations.values())}
        isConnected={connected}
        selectConversation={setConversation}
        user={props.userAuthenticated}
        registerMe={(conversationId) => {
          const conversation = conversations.get(conversationId);

          if (!conversation) return;

          const lastConversation = Conversation.fromRaw(conversation);
          lastConversation.attributeAttendant(
            Attendant.create(
              props.userAuthenticated.id,
              props.userAuthenticated.name
            )
          );
          setConversation(lastConversation.raw());
          setConversations((prev) => {
            prev.set(lastConversation.id, lastConversation.raw());
            return new Map(prev);
          });
        }}
      />
      <ChatEmptyContainer hidden={!!conversation} />
      <div
        data-hidden={!conversation}
        className="flex flex-col overflow-hidden bg-[#F5F1EB]/30 gap-0 w-full flex-1 relative"
      >
        <ChatHeader
          contact={conversation?.contact}
          userInfo={{
            id: props.userAuthenticated.id,
            sector: props.userAuthenticated.sector,
          }}
        />
        <div className="flex flex-1 relative overflow-hidden">
          <div className="w-full overflow-y-auto flex-1 pb-16 flex flex-col relative">
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
              attendantId={conversation?.attendant?.id}
              channel={conversation?.channel!}
              userAuthenticated={props.userAuthenticated}
            />
          </div>
          <ModalCart conversationId={conversation?.id} />
        </div>
      </div>
    </div>
  );
}
