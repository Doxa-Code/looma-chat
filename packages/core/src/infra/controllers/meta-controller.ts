import { MessagePayload } from "../../application/command/message-received";
import { NotAuthorized } from "../../domain/errors/not-authorized";
import { MetaMessageDriver } from "../drivers/message-driver";
import { getRedisClient } from "../drivers/redis";
import { ValidSignature } from "../helpers/valid-signature";

async function addMessageToBuffer(
  key: string,
  message: any,
  flushFn: (msgs: any[]) => Promise<void>
) {
  const redis = getRedisClient();
  const bufferKey = `buffer:${key}`;
  const lockKey = `lock:${key}`;

  await redis.rpush(bufferKey, JSON.stringify(message));

  const gotLock = await redis.set(lockKey, "1", "EX", 6, "NX");

  if (gotLock) {
    return await new Promise((resolve) => {
      setTimeout(async () => {
        const msgs = await redis.lrange(bufferKey, 0, -1);
        await redis.del(bufferKey);
        await redis.del(lockKey);

        if (msgs.length > 0) {
          await flushFn(msgs.map((m) => JSON.parse(m)));
        }
        resolve(null);
      }, 5000);
    });
  }
}

export class MetaController {
  static create({ onChangeMessageStatus, onReceivedMessage }: ControllerProps) {
    return async ({ input, request }: HandleProps) => {
      if (!request) throw NotAuthorized.throw();

      const rawBody = await request.arrayBuffer();
      const signature = request.headers.get("x-hub-signature-256");

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

      await Promise.all([
        await MetaMessageDriver.instance().viewMessage({
          channel: phoneId,
          lastMessageId: messagePayload.id,
        }),
        await (async () => {
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

          await addMessageToBuffer(
            debounceKey,
            newMessage,
            async (messagesToSend) => {
              await onReceivedMessage({
                channel: phoneId,
                contactName: contactProfile?.profile?.name,
                contactPhone,
                wabaId,
                messagePayloads: messagesToSend,
              });
            }
          );
        })(),
      ]);
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
