import { MessagePayload } from "../../application/command/message-received";
import { NotAuthorized } from "../../domain/errors/not-authorized";
import { MetaMessageDriver } from "../drivers/message-driver";
import { ValidSignature } from "../helpers/valid-signature";

const messageBuffers = new Map<
  string,
  {
    messages: MessagePayload[];
    timer?: NodeJS.Timeout;
  }
>();

export class MetaController {
  static create({ onChangeMessageStatus, onReceivedMessage }: ControllerProps) {
    return async ({ input, request }: HandleProps) => {
      if (!request) throw NotAuthorized.throw();

      const rawBody = await request.arrayBuffer();
      const signature = request.headers.get("x-hub-signature-256");

      const isValid = await ValidSignature.valid(rawBody, signature);

      if (!isValid) {
        throw NotAuthorized.throw();
      }

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

      setTimeout(async () => {
        await MetaMessageDriver.instance().viewMessage({
          channel: phoneId,
          lastMessageId: messagePayload.id,
        });
      }, 100);

      const debounceKey = [contactPhone, phoneId].join("-");

      const newMessage: MessagePayload = {
        content:
          messagePayload?.text?.body ??
          messagePayload?.audio?.id ??
          messagePayload?.image?.id,
        id: messagePayload.id,
        timestamp: Number(messagePayload.timestamp),
        type: messagePayload.type,
      };

      let buffer = messageBuffers.get(debounceKey);

      if (!buffer) {
        buffer = { messages: [] };
        messageBuffers.set(debounceKey, buffer);
      }

      buffer.messages.push(newMessage);

      if (buffer.timer) clearTimeout(buffer.timer);

      buffer.timer = setTimeout(async () => {
        const messagesToSend = buffer.messages;
        messageBuffers.delete(debounceKey);

        if (!messagesToSend.length) return;

        await onReceivedMessage({
          channel: phoneId,
          contactName: contactProfile?.profile?.name,
          contactPhone,
          wabaId,
          messagePayloads: messagesToSend,
        });
      }, 5000);
    };
  }
}

type OnReceivedMessageProps = {
  channel: string;
  wabaId: string;
  contactName: string;
  contactPhone: string;
  messagePayloads: MessagePayload[];
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
  request?: any;
};
