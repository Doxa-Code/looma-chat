import { Cart } from "@/core/domain/entities/cart";
import { Conversation } from "@/core/domain/entities/conversation";
import { User } from "@/core/domain/entities/user";
import { RuntimeContext } from "@mastra/core/runtime-context";
import { mastra as ai } from "../ai";

type SendMessageProps = {
  conversation: Conversation;
  aiUser: User;
  workspaceId: string;
  lastCart: Cart | null;
};

interface AIDriver {
  sendMessage(props: SendMessageProps): Promise<string>;
}

export class LoomaAIDriver implements AIDriver {
  async sendMessage(props: SendMessageProps, retry = 0): Promise<string> {
    try {
      // TODO: colocar essas informações no Setting
      const runtimeContext = new RuntimeContext([
        ["contactName", props.conversation.contact.name],
        ["contactPhone", props.conversation.contact.phone],
        ["attendantName", "Looma"],
        ["businessName", "Dromed Pharma"],
        ["pinecone-namespace", "dromed-pharma-odila"],
        ["conversationId", props.conversation.id],
        ["userId", props.aiUser.id],
        ["workspaceId", props.workspaceId],
        [
          "paymentMethods",
          "Cartão de crédito, Cartão de débito, Pix ou Dinheiro",
        ],
        ["locationAvailable", "Aguas de Lindóia"],
      ]);

      const looma = ai.getAgent("loomaAgent");

      const response = await looma.generate(
        props.conversation.lastContactMessages.map((m) => m.content).join("\n"),
        {
          runtimeContext,
          maxSteps: 999,
          memory: {
            resource: props.conversation.contact.phone,
            thread: {
              id: props.conversation.id,
              resourceId: props.conversation.contact.phone,
            },
          },
        }
      );

      const result = response.text;

      return result;
    } catch (err) {
      console.log(err);
      if (retry > 2) {
        return "";
      }
      return await this.sendMessage(props, retry + 1);
    }
  }

  static instance() {
    return new LoomaAIDriver();
  }
}
