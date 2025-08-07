import { Message } from "@/core/domain/entities/message";
import React from "react";
import { MessageContainer } from "./message-container";

type Props = {
  message: Message.Raw;
  hiddenAvatar?: boolean;
};

export const TextBubble: React.FC<Props> = (props) => {
  return (
    <MessageContainer
      createdAt={props.message.createdAt}
      hiddenAvatar={props.hiddenAvatar}
      senderType={props.message.sender.type}
      status={props.message.status}
      senderName={props.message.sender.name}
    >
      <p className="text-sm font-normal py-2">{props.message.content}</p>
    </MessageContainer>
  );
};
