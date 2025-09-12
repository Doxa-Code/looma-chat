import { Message } from "@looma/core/domain/entities/message";
import React from "react";
import { MessageContainer } from "./message-container";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

type Props = {
  message: Message.Raw;
  hiddenAvatar?: boolean;
};

export const TextBubble: React.FC<Props> = (props) => {
  return (
    <MessageContainer
      createdAt={props.message.createdAt}
      hiddenAvatar={props.hiddenAvatar}
      senderType={props.message.sender?.type}
      status={props.message.status}
      senderName={props.message.sender.name}
    >
      <div className="text-sm font-normal prose py-2">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSanitize]}
        >
          {props.message.content}
        </ReactMarkdown>
      </div>
    </MessageContainer>
  );
};
