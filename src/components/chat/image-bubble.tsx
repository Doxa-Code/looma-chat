"use client";
import { Message } from "@/core/domain/entities/message";
import { cx } from "@/lib/utils";
import { Loader } from "lucide-react";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { ProgressBar } from "../progress-bar";
import { Dialog, DialogContent, DialogTrigger } from "../ui/dialog";
import { MessageContainer } from "./message-container";

type Props = {
  message: Message.Raw;
  channel: string;
  hiddenAvatar: boolean;
};

export const ImageBubble: React.FC<Props> = (props) => {
  if (props.message.type !== "image") return <></>;

  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadImage();
  }, []);

  async function loadImage() {
    const response = await fetch(
      `/api/conversations/message/${props.message.id}/image?channel=${props.channel}`
    );
    const buffer = await response.arrayBuffer();

    const blob = new Blob([buffer], { type: "image/png" });
    const url = URL.createObjectURL(blob);
    setImageUrl(url);
    setLoading(false);
  }

  return (
    <MessageContainer
      createdAt={props.message.createdAt}
      senderType={props.message.sender.type}
      status={props.message.status}
      hiddenAvatar={props.hiddenAvatar}
      senderName={props.message.sender.name}
    >
      <div
        data-sender={props.message.sender.type}
        className="group flex w-screen max-w-[250px] px-4 pt-5 flex-col items-start gap-3"
      >
        <div
          data-rounded={!props.hiddenAvatar}
          className={cx(
            "flex flex-col justify-start gap-2 w-full max-w-[320px] leading-1.5 border-gray-200",
            "group-data-[sender=attendant]:data-[rounded=false]:rounded-br-xl group-data-[sender=attendant]:rounded-l-xl group-data-[sender=attendant]:rounded-tr-xl group-data-[sender=attendant]:text-white",
            "group-data-[sender=contact]:rounded-tl-xl group-data-[sender=contact]:data-[rounded=false]:rounded-bl-xl group-data-[sender=contact]:rounded-r-xl group-data-[sender=contact]:rounded-br-xl "
          )}
        >
          <div
            className="w-full gap-4 flex justify-center items-center"
            data-hidden={!loading}
          >
            <Loader className="animate-spin group-data-[sender=contact]:stroke-primary" />
            <ProgressBar
              value={100}
              className="w-full rounded"
              classNameBar="bg-primary groud-data-[sender=attendant]:bg-white"
            />
          </div>
          <Dialog>
            <DialogTrigger className="cursor-pointer">
              <Image
                data-hidden={loading}
                width={2000}
                height={1000}
                alt="image"
                src={imageUrl}
              />
            </DialogTrigger>
            <DialogContent>
              <Image
                data-hidden={loading}
                width={1000}
                height={800}
                alt="image"
                src={imageUrl}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </MessageContainer>
  );
};
