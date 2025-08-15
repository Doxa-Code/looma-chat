"use server";
import { Conversation } from "@looma/core/domain/entities/conversation";
import { Message } from "@looma/core/domain/entities/message";
import { User } from "@looma/core/domain/entities/user";
import { NotAuthorized } from "@looma/core/domain/errors/not-authorized";
import { Attendant } from "@looma/core/domain/value-objects/attendant";
import { Contact } from "@looma/core/domain/value-objects/contact";
import { LoomaAIDriver } from "@/app/ai/ai-driver";
import { MetaMessageDriver } from "@looma/core/infra/drivers/message-driver";
import { ContactsRepository } from "@looma/core/infra/repositories/contacts-repository";
import { ConversationsRepository } from "@looma/core/infra/repositories/conversations-repository";
import { MessagesRepository } from "@looma/core/infra/repositories/messages-repository";
import { SettingsRepository } from "@looma/core/infra/repositories/settings-repository";
import { UsersRepository } from "@looma/core/infra/repositories/users-repository";
import { sseEmitter } from "@/lib/sse";
import z from "zod";
import { createServerAction } from "zsa";
import { securityProcedure } from "../procedure";
import { ValidSignature } from "./helpers";
import { Membership } from "@looma/core/domain/entities/membership";
import { MembershipsRepository } from "@looma/core/infra/repositories/membership-repository";
import pDebounce from "p-debounce";
import { NotFound } from "@looma/core/domain/errors/not-found";
import { CartsRepository } from "@looma/core/infra/repositories/carts-repository";
import { Setting } from "@looma/core/domain/value-objects/setting";
import { JWTTokenDriver } from "@looma/core/infra/drivers/token-driver";
import { Cart } from "@looma/core/domain/entities/cart";

const usersRepository = UsersRepository.instance();
const settingsRepository = SettingsRepository.instance();
const contactsRepository = ContactsRepository.instance();
const conversationsRepository = ConversationsRepository.instance();
const messagesRepository = MessagesRepository.instance();
const cartsRepository = CartsRepository.instance();
const messageDriver = MetaMessageDriver.instance();
const aiDriver = LoomaAIDriver.instance();
const membershipsRepository = MembershipsRepository.instance();

const debouncedMap = new Map<
  string,
  (
    conversation: Conversation,
    workspaceId: string,
    settings: Setting
  ) => Promise<void>
>();

function getSendToLoomaDebounced(conversationId: string) {
  if (!debouncedMap.has(conversationId)) {
    const fn = pDebounce(
      async (
        conversation: Conversation,
        workspaceId: string,
        settings: Setting
      ) => {
        const messages = conversation.lastContactMessages.map((m) => m.content);
        if (!messages.length) return;
        try {
          let loomaUser = await usersRepository.retrieveUserByEmail(
            "looma@doxacode.com.br"
          );

          if (!loomaUser) {
            loomaUser = User.create({
              email: "looma@doxacode.com.br",
              name: "Looma AI",
              type: "system",
            });
            await usersRepository.upsert(loomaUser);
          }

          let membership =
            await membershipsRepository.retrieveByUserIdAndWorkspaceId(
              loomaUser.id,
              workspaceId
            );

          if (!membership) {
            membership = Membership.create(workspaceId, loomaUser.id);
            membership.setPermissions(["manage:carts", "view:products"]);
            await membershipsRepository.upsert(membership);
          }

          const [lastCart, currentCart] = await Promise.all([
            cartsRepository.retrieveLastCartByContactPhone(
              conversation.contact.phone,
              workspaceId
            ),
            cartsRepository.retrieveOpenCartByConversationId(
              conversation.id,
              workspaceId
            ),
          ]);

          let content = "";

          for (const message of conversation.lastContactMessages) {
            if (message?.type === "audio") {
              const arrayBuffer = await messageDriver.downloadMedia(
                conversation.channel,
                message.content
              );
              const transcript = await aiDriver.transcriptAudio({
                audio: arrayBuffer,
              });
              content += `${transcript}\n`;
              continue;
            }

            if (message?.type === "image") {
              const arrayBuffer = await messageDriver.downloadMedia(
                conversation.channel,
                message.content
              );
              const transcript = await aiDriver.analyzerImage({
                image: arrayBuffer,
              });
              content += `${transcript}\n`;
              continue;
            }
            content += message.content;
          }

          sseEmitter.emit("typing");

          await messageDriver.sendTyping({
            lastMessageId: conversation.lastContactMessages.at(-1)?.id!,
            channel: conversation.channel,
          });

          const response = await aiDriver.sendMessage({
            aiUser: loomaUser,
            workspaceId,
            lastCart,
            currentCart,
            contact: conversation.contact,
            conversationId: conversation.id,
            content,
            settings,
          });

          const messageId = await messageDriver.sendMessageText({
            channel: conversation.channel,
            content: response,
            to: conversation.contact.phone,
          });

          const message = Message.create({
            content: response,
            createdAt: new Date(),
            id: messageId,
            sender: Attendant.create(loomaUser.id, loomaUser.name),
            type: "text",
          });

          conversation.addMessage(message);

          await conversationsRepository.upsert(conversation, workspaceId);

          sseEmitter.emit("message", conversation.raw());
          sseEmitter.emit("untyping");
        } catch (err) {
          console.log(err);
          sseEmitter.emit("untyping");
        }
      },
      3000
    );

    debouncedMap.set(conversationId, fn);
  }

  return debouncedMap.get(conversationId)!;
}

export const listenAudio = securityProcedure([
  "view:conversation",
  "view:conversations",
])
  .input(
    z.object({
      channel: z.string(),
      messageId: z.string(),
    })
  )
  .handler(async ({ input }) => {
    const message = await messagesRepository.retrieve(input.messageId);

    if (!message || message?.type !== "audio") return;

    const arrayBuffer = await messageDriver.downloadMedia(
      input.channel,
      message.content
    );
    return new Response(arrayBuffer, {
      headers: {
        "Content-Type": "audio/ogg",
      },
    });
  });

export const retrieveImage = securityProcedure([
  "view:conversation",
  "view:conversations",
])
  .input(
    z.object({
      channel: z.string(),
      messageId: z.string(),
    })
  )
  .handler(async ({ input }) => {
    const message = await messagesRepository.retrieve(input.messageId);

    if (!message || message?.type !== "image") return;

    const arrayBuffer = await messageDriver.downloadMedia(
      input.channel,
      message.content
    );

    return new Response(new Uint8Array(arrayBuffer), {
      headers: {
        "Content-Type": "image/jpeg",
      },
    });
  });

export const sendAudio = securityProcedure(["send:message"])
  .input(
    z.object({
      file: z.instanceof(File),
      conversationId: z.string(),
    })
  )
  .handler(async ({ ctx, input }) => {
    const conversation = await conversationsRepository.retrieve(
      input.conversationId
    );

    if (!conversation) return;

    await messageDriver.sendTyping({
      lastMessageId: conversation.lastContactMessages?.at(-1)?.id!,
      channel: conversation.channel,
    });

    const attendant = Attendant.create(ctx.user.id, ctx.user.name);

    if (!conversation.attendant) {
      conversation.attributeAttendant(attendant);
    }

    const { id: messageId, mediaId } = await messageDriver.sendMessageAudio({
      channel: conversation.channel,
      to: conversation.contact.phone,
      file: input.file,
    });

    conversation.addMessage(
      Message.create({
        content: mediaId,
        createdAt: new Date(),
        id: messageId,
        sender: attendant,
        type: "audio",
      })
    );

    sseEmitter.emit("message", conversation.raw());

    await conversationsRepository.upsert(
      conversation,
      ctx.membership.workspaceId
    );
  });

export const sendMessage = securityProcedure(["send:message"])
  .input(z.object({ conversationId: z.string(), content: z.string() }))
  .handler(async ({ ctx, input }) => {
    const conversation = await conversationsRepository.retrieve(
      input.conversationId
    );

    if (!conversation) return;

    await messageDriver.sendTyping({
      lastMessageId: conversation.lastContactMessages?.at(-1)?.id!,
      channel: conversation.channel,
    });

    const attendant = Attendant.create(ctx.user.id, ctx.user.name);

    if (!conversation.attendant) {
      conversation.attributeAttendant(attendant);
    }

    const messageId = await messageDriver.sendMessageText({
      channel: conversation.channel,
      content: input.content,
      to: conversation.contact.phone,
    });

    const message = Message.create({
      content: input.content,
      createdAt: new Date(),
      id: messageId,
      sender: attendant,
      type: "text",
    });

    conversation.addMessage(message);

    sseEmitter.emit("message", conversation.raw());

    await conversationsRepository.upsert(
      conversation,
      ctx.membership.workspaceId
    );
  });

export const listAllConversations = securityProcedure([
  "view:conversations",
  "view:conversation",
]).handler(async ({ ctx }) => {
  if (
    ctx.user.isSuperUser() ||
    ctx.membership.hasPermission("view:conversations")
  ) {
    const response = await conversationsRepository.list(
      ctx.membership.workspaceId
    );
    return response.map((c) => c.raw());
  }
  return (
    await conversationsRepository.listBySectorAndAttendantId(
      ctx.user.id,
      ctx.user.sector?.id
    )
  ).map((c) => c.raw());
});

export const registerMessaging = createServerAction()
  .input(z.any())
  .handler(async ({ input }) => {
    const userId = JWTTokenDriver.instance().decode(input["hub.verify_token"]);

    if (!userId) throw new NotAuthorized();

    const user = await usersRepository.retrieve(userId);
    if (!user || user.email !== "looma@doxacode.com.br")
      throw new NotAuthorized();

    return input["hub.challenge"];
  });

export const showCart = securityProcedure([
  "manage:carts",
  "send:message",
  "view:conversation",
  "view:conversations",
])
  .input(z.object({ conversationId: z.string() }))
  .handler(async ({ input, ctx }) => {
    const conversation = await conversationsRepository.retrieve(
      input.conversationId
    );

    if (!conversation) throw NotFound.instance("Conversation");

    let cart = await cartsRepository.retrieveOpenCartByConversationId(
      input.conversationId,
      ctx.membership.workspaceId
    );

    if (!cart) throw NotFound.instance("Cart");

    const messageId = await messageDriver.sendMessageText({
      channel: conversation.channel,
      content: cart.formatted,
      to: conversation.contact.phone,
    });

    const message = Message.create({
      content: cart.formatted,
      createdAt: new Date(),
      id: messageId,
      sender: conversation.attendant!,
      type: "text",
    });

    conversation.addMessage(message);

    sseEmitter.emit("message", conversation.raw());

    await conversationsRepository.upsert(
      conversation,
      ctx.membership.workspaceId
    );

    return cart.formatted;
  });

export const receivedMessage = createServerAction()
  .input(z.any())
  .onError(async (err) => {
    console.log(err);
  })
  .handler(async ({ input, request }) => {
    if (!request) throw new NotAuthorized();

    const rawBody = await request.arrayBuffer();
    const signature = request.headers.get("x-hub-signature-256");

    const isValid = await ValidSignature.valid(rawBody, signature);

    if (!isValid) {
      throw NotAuthorized.throw();
    }

    const [entry] = input.entry;

    const statuses = entry?.changes?.[0]?.value?.statuses?.[0];

    if (statuses) {
      const message = await messagesRepository.retrieve(statuses.id);

      if (!message) return;

      if (statuses.status === "sent") {
        message.markAsSent();
      }

      if (statuses.status === "delivered") {
        message.markAsDelivered();
      }

      if (statuses.status === "read") {
        message.markAsViewed();
      }

      const conversationId = await messagesRepository.upsert(message);

      if (conversationId) {
        const conversation =
          await conversationsRepository.retrieve(conversationId);
        if (!conversation) return;
        sseEmitter.emit("message", conversation.raw());
      }

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

    const responseSetting =
      await settingsRepository.retrieveSettingByWabaIdAndPhoneId(
        wabaId,
        phoneId
      );

    const setting = responseSetting?.setting;
    const workspaceId = responseSetting?.workspaceId;

    if (!setting || !workspaceId) return;

    const contactProfile = contacts?.at(0);

    if (!contactProfile) return;

    let contact = await contactsRepository.retrieve(contactProfile.wa_id);

    if (!contact) {
      contact = Contact.create(
        contactProfile?.wa_id,
        contactProfile?.profile.name
      );
      await contactsRepository.upsert(contact);
    }

    let conversation: Conversation | null =
      await conversationsRepository.retrieveByContactPhone(
        contact.phone,
        phoneId
      );

    if (!conversation) {
      conversation = Conversation.create(contact, phoneId);
    }

    conversation.setChannel(phoneId);

    const message =
      messagePayload?.type === "text"
        ? Message.create({
            content: messagePayload.text.body,
            id: messagePayload.id,
            createdAt: new Date(messagePayload.timestamp * 1000),
            sender: contact,
            type: "text",
          })
        : messagePayload?.type === "audio"
          ? Message.create({
              id: messagePayload.id,
              createdAt: new Date(messagePayload.timestamp * 1000),
              sender: contact,
              content: messagePayload.audio.id,
              type: "audio",
            })
          : Message.create({
              id: messagePayload.id,
              createdAt: new Date(messagePayload.timestamp * 1000),
              sender: contact,
              content: messagePayload?.image?.id,
              type: "image",
            });

    if (conversation.messages.some((m) => m.id === message.id)) return;

    message.markAsDelivered();
    conversation.addMessage(message);

    await conversationsRepository.upsert(conversation, workspaceId);

    sseEmitter.emit("message", conversation.raw());

    let settings =
      await settingsRepository.retrieveSettingsByWorkspaceId(workspaceId);

    if (!settings) {
      settings = Setting.create();
    }

    if (setting.aiEnabled) {
      await getSendToLoomaDebounced(conversation.id)(
        conversation,
        workspaceId,
        settings
      );
    }
  });

export const markLastMessagesContactAsViewed = securityProcedure([
  "view:conversation",
  "view:conversations",
])
  .input(z.object({ conversationId: z.string() }))
  .handler(async ({ input, ctx: { membership } }) => {
    const conversation = await conversationsRepository.retrieve(
      input.conversationId
    );
    if (!conversation) return;

    conversation.markLastMessagesContactAsViewed();

    await conversationsRepository.upsert(conversation, membership.workspaceId);
    sseEmitter.emit("message", conversation.raw());
  });
