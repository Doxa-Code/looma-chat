import { createTool } from "@mastra/core/tools";
import axios from "axios";
import { z } from "zod";
import { saveMessageOnThread } from "../utils";

export const consultingCepTool = createTool({
  id: "consulting-cep-tool",
  description: "Use para consultar o CEP de um endereço",
  inputSchema: z.object({
    cep: z.string().describe("CEP a ser consultado"),
  }),
  outputSchema: z.object({
    cep: z.string(),
    state: z.string(),
    city: z.string(),
    neighborhood: z.string(),
    street: z.string(),
  }),
  execute: async ({ context, resourceId, threadId }) => {
    try {
      const response = await axios.get<{
        cep: string;
        state: string;
        city: string;
        neighborhood: string;
        street: string;
      }>(`https://brasilapi.com.br/api/cep/v1/${context.cep}`);

      const result = {
        cep: response.data.cep,
        state: response.data.state,
        city: response.data.city,
        neighborhood: response.data.neighborhood,
        street: response.data.street,
      };

      if (resourceId && threadId) {
        await saveMessageOnThread({
          content: result,
          resourceId,
          threadId,
        });
      }

      return {
        cep: response.data.cep,
        state: response.data.state,
        city: response.data.city,
        neighborhood: response.data.neighborhood,
        street: response.data.street,
      };
    } catch (err: any) {
      console.log(err?.response?.data ?? err.message);
      return {
        cep: context.cep,
        state: "",
        city: "",
        neighborhood: "",
        street: "",
      };
    }
  },
});
