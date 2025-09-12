import { sendAudio, sendMessage } from "@/app/actions/messages";
import { useServerActionMutation } from "@/hooks/server-action-hooks";
import { Message } from "@looma/core/domain/entities/message";
import { User } from "@looma/core/domain/entities/user";
import { Attendant } from "@looma/core/domain/value-objects/attendant";
import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";
import { Textarea } from "../ui/textarea";

const VoiceRecorder = dynamic(
  () => import("./voice-recorder").then((Comp) => Comp.VoiceRecorder),
  { ssr: false }
);

type Props = {
  conversationId?: string;
  channel: string;
  addMessage(message: Message.Raw): void;
  userAuthenticated: User.Raw;
  attendantId?: string;
};

export const ChatForm: React.FC<Props> = (props) => {
  const formRef = useRef<HTMLFormElement>(null);
  const [inRecording, setInRecording] = useState(false);
  const sendMessageAction = useServerActionMutation(sendMessage);
  const sendAudioAction = useServerActionMutation(sendAudio);
  const disabled = useMemo(
    () =>
      !props.attendantId || props.attendantId !== props.userAuthenticated.id,
    [props.attendantId, props.userAuthenticated.id]
  );

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
      data-disabled={disabled}
      className="w-[98%] data-[disabled=true]:hidden shadow z-50 h-screen max-h-[52px] absolute bottom-5 flex left-[50%] -translate-x-[50%] items-center bg-white rounded-full border gap-2 p-3"
    >
      {/* <FileButton
        conversationId={props.conversationId}
        onAddMessage={(message) => {
          // TODO: adicionar file
        }}
      /> */}
      <Textarea
        data-hidden={inRecording}
        className="resize-none focus-visible:ring-0 border-0 shadow-none rounded-4xl flex-1 font-light max-h-[200px]"
        rows={1}
        placeholder="Digite sua mensagem"
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
