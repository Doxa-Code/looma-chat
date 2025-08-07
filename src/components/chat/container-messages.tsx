import { Message } from "@/core/domain/entities/message";
import { formatRelative, isSameDay } from "date-fns";
import { pt } from "date-fns/locale/pt";
import React, { RefObject } from "react";
import { Badge } from "../ui/badge";
import { AudioBubble } from "./audio-bubble";
import { MessageLoading } from "./message-loading";
import { TextBubble } from "./text-bubble";

type Props = {
  ref: RefObject<HTMLDivElement | null>;
  messages: Message.Raw[];
  channel: string;
  typing: boolean;
};

export const ContainerMessages: React.FC<Props> = (props) => {
  return (
    <div
      ref={props.ref}
      className="flex-1 flex flex-col overflow-y-auto py-24 gap-2 p-6"
    >
      {props.messages.map((message, i) => {
        const lastMessage = props.messages?.[i - 1];
        const nextMessage = props.messages?.[i + 1];

        const isNewDay =
          !isSameDay(message.createdAt, lastMessage?.createdAt) || i === 0;

        const hiddenAvatar = message.sender.id === nextMessage?.sender?.id;

        return (
          <div key={message.id}>
            <div
              data-hidden={!isNewDay}
              className="w-full flex items-center justify-center"
            >
              <Badge
                variant="outline"
                className="bg-muted text-muted-foreground border-0"
              >
                {formatRelative(message.createdAt, new Date(), {
                  locale: pt,
                })}
              </Badge>
            </div>
            {message.type === "audio" ? (
              <AudioBubble
                key={message.id}
                message={message}
                channel={props.channel}
                hiddenAvatar={hiddenAvatar}
              />
            ) : (
              <TextBubble message={message} hiddenAvatar={hiddenAvatar} />
            )}
          </div>
        );
      })}
      <MessageLoading typing={props.typing} />
    </div>
  );
};
