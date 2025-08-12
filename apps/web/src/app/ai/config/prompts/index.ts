import { Cart } from "@/domain/entities/cart";
import { Setting } from "@/domain/value-objects/setting";
import { RuntimeContext } from "@mastra/core/runtime-context";
import { SystemPromptLeaf } from "./system-prompt-leaf";
import { InitialPromptLeaf } from "./initial-prompt-leaf";
import { OrderPromptLeaf } from "./order-prompt-leaf";
import { AddressPromptLeaf } from "./address-prompt-leaf";
import { PaymentMethodPromptLeaf } from "./payment-method-prompt-leaf";
import { FinishPromptLeaf } from "./finish-prompt-leaf";
import { CancelPromptLeaf } from "./cancel-prompt-leaf";
import { FAQPromptLeaf } from "./faq-prompt-leaf";
import { RulesPromptLeaf } from "./rules-prompt-leaf";
import { StylePromptLeaf } from "./style-prompt-leaf";
import { RelevantPromptLeaf } from "./relevant-prompt-leaf";

type Context = {
  contactName: string;
  contactPhone: string;
  lastCart: Cart | null;
  settings: Setting;
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
  FinishPromptLeaf.instance(),
  CancelPromptLeaf.instance(),
  FAQPromptLeaf.instance(),
  RulesPromptLeaf.instance(),
  RelevantPromptLeaf.instance()
);

export { prompt };
