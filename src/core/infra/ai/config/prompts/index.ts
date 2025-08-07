import { Cart } from "@/core/domain/entities/cart";
import { RuntimeContext } from "@mastra/core/runtime-context";

type Context = {
  attendantName: string;
  businessName: string;
  contactName: string;
  contactPhone: string;
  paymentMethods: string;
  locationAvailable: string;
  lastCart: Cart | null;
  knowledgeBase: string;
};

export type InstructionsProps = {
  runtimeContext: RuntimeContext<Context>;
};

export type Instructions = (props: InstructionsProps) => string;
