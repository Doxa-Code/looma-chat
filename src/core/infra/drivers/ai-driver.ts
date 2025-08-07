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
  attendantName: string;
  businessName: string;
  vectorNamespace: string;
  paymentMethods: string;
  locationAvailable: string;
  knowledgeBase: string;
};

interface AIDriver {
  sendMessage(props: SendMessageProps): Promise<string>;
}

export class LoomaAIDriver implements AIDriver {
  async sendMessage(props: SendMessageProps, retry = 0): Promise<string> {
    try {
      const runtimeContext = new RuntimeContext([
        ["contactName", props.conversation.contact.name],
        ["contactPhone", props.conversation.contact.phone],
        ["attendantName", props.attendantName],
        ["businessName", props.businessName],
        ["vector-namespace", props.vectorNamespace],
        ["conversationId", props.conversation.id],
        ["userId", props.aiUser.id],
        ["workspaceId", props.workspaceId],
        ["paymentMethods", props.paymentMethods],
        ["locationAvailable", props.locationAvailable],
        ["knowledgeBase", props.knowledgeBase],
        [
          "databaseConfig",
          {
            pinecone: {
              namespace: props.vectorNamespace,
            },
          },
        ],
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
