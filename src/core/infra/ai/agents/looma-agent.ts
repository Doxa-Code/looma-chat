import { Agent } from "@mastra/core/agent";
import { azure } from "../config/llms/azure";
import { memoryWithVector } from "../config/memories";
import instructions from "../config/prompts/looma-prompt";
import {
  removeProductFromCartTool,
  retrieveCartTool,
  setAddressCartTool,
  setPaymentMethodCartTool,
  showCartTool,
  addProductOnCartTool,
  closeCartTool,
  cancelCartTool,
  retrieveClientTool,
} from "../tools/cart-tools";
import { promotionProductsTool, stockTool } from "../tools/stock-tool";
import { consultingCepTool } from "../tools/consulting-cep-tool";
import { knowledgeBaseTool } from "../tools/knowledge-base-tool";

export const loomaAgent = new Agent({
  name: "Looma Agent",
  instructions,
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
    knowledgeBaseTool,
    closeCartTool,
    cancelCartTool,
    retrieveClientTool,
  },
});
