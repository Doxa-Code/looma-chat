import { useRef, useState } from "react";
import { Textarea } from "../ui/textarea";
import { FileButton } from "./file-button";
import { useServerActionMutation } from "@/hooks/server-action-hooks";
import { sendMessage, sendAudio } from "@/app/actions/conversations";
import { Message } from "@looma/core/domain/entities/message";
import { Attendant } from "@looma/core/domain/value-objects/attendant";
import dynamic from "next/dynamic";
import { User } from "@looma/core/domain/entities/user";

const VoiceRecorder = dynamic(
  () => import("./voice-recorder").then((Comp) => Comp.VoiceRecorder),
  { ssr: false }
);

type Props = {
  conversationId?: string;
  channel: string;
  addMessage(message: Message.Raw): void;
  userAuthenticated: User.Raw;
};

export const ChatForm: React.FC<Props> = (props) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [inRecording, setInRecording] = useState(false);
  const sendMessageAction = useServerActionMutation(sendMessage);
  const sendAudioAction = useServerActionMutation(sendAudio);

  return (
    <form
      ref={formRef}
      onSubmit={async (e) => {
        e.preventDefault();

        if (!props.conversationId) return;

        const form = new FormData(e.currentTarget);
        const text = form.get("message")?.toString() ?? "";

        const message = Message.create({
          content: text,
          createdAt: new Date(),
          id: crypto.randomUUID().toString(),
          sender: Attendant.create(
            props.userAuthenticated.id,
            props.userAuthenticated.name
          ),
          type: "text",
        });

        props?.addMessage?.(message.raw());

        await sendMessageAction.mutateAsync({
          content: text,
          conversationId: props.conversationId,
        });
      }}
      className="w-full z-50 absolute bottom-0 flex items-center bg-white gap-2 p-3"
    >
      {/* <FileButton
        conversationId={props.conversationId}
        onAddMessage={(message) => {
          // TODO: adicionar file
        }}
      /> */}
      <Textarea
        data-hidden={inRecording}
        className="resize-none rounded-4xl flex-1 font-light max-h-[200px]"
        rows={1}
        name="message"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            formRef?.current?.requestSubmit();
            formRef?.current?.reset();
            return;
          }
        }}
      />
      <VoiceRecorder
        setStateRecording={setInRecording}
        onFinish={async (file) => {
          const url = URL.createObjectURL(file);

          const message = Message.create({
            content: url,
            createdAt: new Date(),
            id: crypto.randomUUID().toString(),
            sender: Attendant.create(
              props.userAuthenticated.id,
              props.userAuthenticated.name
            ),
            type: "audio",
          });

          props?.addMessage?.(message.raw());

          sendAudioAction.mutate({
            conversationId: props.conversationId!,
            file,
          });
        }}
      />
    </form>
  );
};
