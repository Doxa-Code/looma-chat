import { Agent } from "@mastra/core/agent";
import { azure } from "../config/llms/azure";
import { memoryWithVector } from "../config/memories";
import { prompt } from "../config/prompts";
import {
  addProductOnCartTool,
  cancelCartTool,
  closeCartTool,
  removeProductFromCartTool,
  retrieveCartTool,
  retrieveClientTool,
  setAddressCartTool,
  setPaymentMethodCartTool,
  showCartTool,
} from "../tools/cart-tools";
import { consultingCepTool } from "../tools/consulting-cep-tool";
import { promotionProductsTool, stockTool } from "../tools/stock-tool";
import { closeConversationTool } from "../tools/conversation-tools";

export const loomaAgent = new Agent({
  name: "Looma Agent",
  instructions({ runtimeContext }) {
    return prompt.mount({ runtimeContext });
  },
  model: azure("gpt-4.1"),
  memory: memoryWithVector,
  tools: {
    stockTool,
    consultingCepTool,
    retrieveCartTool,
    addProductOnCartTool,
    removeProductFromCartTool,
    showCartTool,
    setAddressCartTool,
    setPaymentMethodCartTool,
    promotionProductsTool,
    closeCartTool,
    cancelCartTool,
    retrieveClientTool,
    closeConversationTool,
  },
});
