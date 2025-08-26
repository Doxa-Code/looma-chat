import { Agent } from "@mastra/core/agent";
import { azure } from "../config/llms/azure";
import { memoryWithVector } from "../config/memories";
import { prompt } from "../config/prompts/looma-prompt";
import {
  addProductOnCartTool,
  cancelCartTool,
  closeCartTool,
  getCurrentCartTool,
  getLastCartTool,
  removeProductFromCartTool,
  setAddressCartTool,
  setPaymentMethodCartTool,
  showCartTool,
} from "../tools/cart-tools";
import { consultingCepTool } from "../tools/consulting-cep-tool";
import {
  closeConversationTool,
  retrieveClientTool,
} from "../tools/conversation-tools";
import { promotionProductsTool, stockTool } from "../tools/stock-tool";
import { pharmaAgentTool } from "./pharma-agent";

export const loomaAgent = new Agent({
  name: "Looma Agent",
  instructions: prompt,
  model: azure("looma-ai", {
    parallelToolCalls: true,
  }),
  memory: memoryWithVector,
  tools: {
    stockTool,
    promotionProductsTool,
    addProductOnCartTool,
    removeProductFromCartTool,
    closeCartTool,
    setAddressCartTool,
    setPaymentMethodCartTool,
    showCartTool,
    cancelCartTool,
    closeConversationTool,
    getLastCartTool,
    getCurrentCartTool,
    consultingCepTool,
    retrieveClientTool,
    pharmaAgentTool,
  },
});
