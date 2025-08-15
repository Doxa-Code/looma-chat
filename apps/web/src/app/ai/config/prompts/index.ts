import { Cart } from "@looma/core/domain/entities/cart";
import { Setting } from "@looma/core/domain/value-objects/setting";
import { RuntimeContext } from "@mastra/core/runtime-context";
import { AddressPromptLeaf } from "./address-prompt-leaf";
import { CancelPromptLeaf } from "./cancel-prompt-leaf";
import { FAQPromptLeaf } from "./faq-prompt-leaf";
import { InitialPromptLeaf } from "./initial-prompt-leaf";
import { OrderPromptLeaf } from "./order-prompt-leaf";
import { PaymentMethodPromptLeaf } from "./payment-method-prompt-leaf";
import { RelevantPromptLeaf } from "./relevant-prompt-leaf";
import { RulesPromptLeaf } from "./rules-prompt-leaf";
import { StylePromptLeaf } from "./style-prompt-leaf";
import { SystemPromptLeaf } from "./system-prompt-leaf";

export type Context = {
  contactName: string;
  contactPhone: string;
  lastCart: Cart | null;
  currentCart: Cart | null;
  settings: Setting;
  sectors: string;
  databaseConfig: any;
  conversationId: string;
  workspaceId: string;
  userId: string;
};

export type PromptLeafProps = {
  runtimeContext: RuntimeContext<Context>;
};

export interface PromptLeaf {
  mount(input: PromptLeafProps): string;
}

class PromptComposite implements PromptLeaf {
  private leafs: PromptLeaf[] = [];

  register(...leaf: PromptLeaf[]) {
    this.leafs.push(...leaf);
  }

  mount(input: PromptLeafProps): string {
    let result = "";
    for (const leaf of this.leafs) {
      result += `${leaf.mount(input).trim()}\n\n`;
    }

    return result;
  }

  static instance() {
    return new PromptComposite();
  }
}

const prompt = PromptComposite.instance();

prompt.register(
  SystemPromptLeaf.instance(),
  StylePromptLeaf.instance(),
  InitialPromptLeaf.instance(),
  OrderPromptLeaf.instance(),
  AddressPromptLeaf.instance(),
  PaymentMethodPromptLeaf.instance(),
  CancelPromptLeaf.instance(),
  FAQPromptLeaf.instance(),
  RulesPromptLeaf.instance(),
  RelevantPromptLeaf.instance()
);

export { prompt };
