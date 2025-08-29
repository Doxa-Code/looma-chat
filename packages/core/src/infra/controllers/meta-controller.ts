import { MessagePayload } from "../../application/command/message-received";
import { NotAuthorized } from "../../domain/errors/not-authorized";
import { ValidSignature } from "../helpers/valid-signature";

export class MetaController {
  static create({ onChangeMessageStatus, onReceivedMessage }: ControllerProps) {
    return async ({ input, rawBody, signature }: HandleProps) => {
      if (!rawBody || !signature) throw NotAuthorized.throw();

      const isValid = await ValidSignature.valid(rawBody, signature);
      if (!isValid) throw NotAuthorized.throw();

      const [entry] = input.entry;

      const statuses = entry?.changes?.[0]?.value?.statuses?.[0];
      if (statuses) {
        await onChangeMessageStatus({
          messageId: statuses.id,
          status: statuses.status,
        });
        return;
      }

      const {
        id: wabaId,
        changes: [
          {
            value: {
              contacts,
              metadata: { phone_number_id: phoneId },
              messages: [messagePayload],
            },
          },
        ],
      } = entry;

      const contactProfile = contacts?.at?.(0);
      const contactPhone = contactProfile?.wa_id;

      if (!contactPhone) return;

      const newMessage: MessagePayload = {
        content:
          messagePayload?.text?.body ??
          messagePayload?.audio?.id ??
          messagePayload?.image?.id,
        id: messagePayload.id,
        timestamp: Number(messagePayload.timestamp),
        type: messagePayload.type,
      };

      await onReceivedMessage({
        channel: phoneId,
        contactName: contactProfile?.profile?.name,
        contactPhone,
        wabaId,
        messagePayload: newMessage,
      });
    };
  }
}

type OnReceivedMessageProps = {
  channel: string;
  wabaId: string;
  contactName: string;
  contactPhone: string;
  messagePayload: MessagePayload;
};

type OnChangeMessageStatusProps = {
  messageId: string;
  status: string;
};

type ControllerProps = {
  onChangeMessageStatus(props: OnChangeMessageStatusProps): Promise<void>;
  onReceivedMessage(props: OnReceivedMessageProps): Promise<void>;
};

type HandleProps = {
  input?: any;
  rawBody: ArrayBuffer;
  signature: string;
};
