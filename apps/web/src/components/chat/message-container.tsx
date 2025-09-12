"use client";
import { Message } from "@looma/core/domain/entities/message";
import { SenderType } from "@looma/core/domain/value-objects/sender";
import { cx } from "@/lib/utils";
import { format } from "date-fns";
import { Avatar } from "flowbite-react";
import { Check, CheckCheckIcon, Clock7, User2 } from "lucide-react";
import { useState } from "react";

type Props = React.PropsWithChildren & {
  senderType: SenderType;
  senderName: string;
  hiddenAvatar?: boolean;
  createdAt: Date;
  status: Message.Status;
};

export const MessageContainer: React.FC<Props> = (props) => {
  const [showName, setShowName] = useState(false);
  return (
    <div
      className={cx(
        "w-full flex flex-col gap-2 justify-center",
        props.senderType === "attendant" ? "items-end" : "items-start"
      )}
    >
      <div
        className={cx(
          "flex items-start gap-3",
          props.senderType === "attendant" && "flex-row-reverse"
        )}
      >
        {props.senderType === "contact" ? (
          <div className="rounded-full shadow w-10 h-10 bg-white flex items-center justify-center">
            <User2 className="stroke-1 size-5" />
          </div>
        ) : (
          <div
            onClick={() => setShowName(!showName)}
            data-show-name={showName}
            className="w-10 h-10 border cursor-pointer hover:shadow-2xl rounded-full bg-opacity-10 shadow flex justify-center items-center data-[show-name=true]:shadow-inner bg-white"
          >
            {props.senderName === "Looma AI" ? (
              <Avatar img="/icon.png" />
            ) : (
              <User2 className="stroke-1 size-5" />
            )}
          </div>
        )}
        <div className="flex flex-col items-start gap-3">
          <div
            data-rounded={!props.hiddenAvatar}
            className={cx(
              "flex flex-col gap-0 w-full max-w-[420px] border px-3 pb-1 border-gray-200",
              props.senderType === "attendant"
                ? "data-[rounded=false]:rounded-br-xl rounded-l-xl rounded-br-xl bg-[#D9FDD3] text-[#0A0A0A]"
                : "rounded-bl-xl data-[rounded=false]:rounded-bl-xl rounded-r-xl rounded-br-xl bg-white"
            )}
          >
            {props.children}
            <div className="flex items-center flex-1 pb-1 justify-end gap-1">
              <span
                className={cx(
                  "!text-[10px] font-normal opacity-85",
                  props.senderType === "attendant"
                    ? "text-[#6A7C67] self-end"
                    : "text-muted-foreground"
                )}
              >
                {format(props.createdAt, "HH:mm")}
              </span>
              <Clock7
                data-show={
                  props.status === "senting" && props.senderType === "attendant"
                }
                className="size-3 stroke-[#6A7C67] hidden"
              />
              <Check
                data-show={
                  props.status === "sent" && props.senderType === "attendant"
                }
                className="size-4 stroke-[#6A7C67] hidden"
              />
              <CheckCheckIcon
                data-show={
                  ["delivered", "viewed"].includes(props.status) &&
                  props.senderType === "attendant"
                }
                className={cx(
                  "size-4 hidden",
                  props.status === "viewed" && "stroke-[#007BFC]"
                )}
              />
            </div>
          </div>
        </div>
      </div>
      <span data-hidden={!showName} className="text-muted-foreground text-xs">
        {props.senderName}
      </span>
    </div>
  );
};
