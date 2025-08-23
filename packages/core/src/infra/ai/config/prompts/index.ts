import { RuntimeContext } from "@mastra/core/runtime-context";
import { Cart } from "../../../../domain/entities/cart";
import { Setting } from "../../../../domain/value-objects/setting";

export type Context = {
  contactName: string;
  contactPhone: string;
  lastCart: Cart | null;
  currentCart: Cart | null;
  settings: Setting;
  sectors: string;
  conversationId: string;
  workspaceId: string;
  userId: string;
  userName: string;
  agentOptions: {
    memory: {
      resource: string;
      thread: {
        id: string;
        resourceId: string;
      };
    };
    telemetry: {
      isEnabled: true;
      recordInputs: true;
      recordOutputs: true;
    };
  };
};

export type PromptProps = {
  runtimeContext: RuntimeContext<Context>;
};
