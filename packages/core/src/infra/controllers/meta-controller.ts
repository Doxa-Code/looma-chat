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
  const messageIdKey = `processed:${message.id}`;

  // 1️⃣ Deduplicação: ignora mensagens já processadas
  const isDuplicate = await redis.get(messageIdKey);
  if (isDuplicate) return;

  // Marca como processada por 1 hora
  await redis.set(messageIdKey, "1", "EX", 3600);

  // 2️⃣ Adiciona ao buffer
  await redis.rpush(bufferKey, JSON.stringify(message));

  // 3️⃣ Tenta criar lock NX
  const gotLock = await redis.set(lockKey, "1", "NX");

  if (gotLock) {
    // 4️⃣ Lock criado, define expiração
    await redis.set(lockKey, "1", "EX", 5);

    // Função para processar o buffer quando não houver novas mensagens
    const processBuffer = async () => {
      while (true) {
        const ttl = await redis.ttl(lockKey);
        if (ttl && ttl > 0) {
          await new Promise((res) => setTimeout(res, 500));
        } else {
          break;
        }
      }

      // 5️⃣ Lê o buffer e limpa
      const msgs = await redis.lrange(bufferKey, 0, -1);
      await redis.del(bufferKey);
      await redis.del(lockKey);

      if (msgs.length > 0) {
        await flushFn(msgs.map((m) => JSON.parse(m)));
      }
    };

    processBuffer().catch(console.error);
  } else {
    // 6️⃣ Lock já existe: reseta o TTL para adiar o flush
    await redis.expire(lockKey, 5);
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
