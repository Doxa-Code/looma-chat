import { createTool } from '@mastra/core/tools';
import axios from 'axios';
import { z } from 'zod';
import { s as saveMessageOnThread } from '../index2.mjs';
import '@mastra/memory';
import '@ai-sdk/azure';
import '@mastra/pg';
import '@mastra/core';
import '@pinecone-database/pinecone';

const consultingCepTool = createTool({
  id: "consulting-cep-tool",
  description: "Use para consultar o CEP de um endere\xE7o",
  inputSchema: z.object({
    cep: z.string().describe("CEP a ser consultado")
  }),
  outputSchema: z.object({
    cep: z.string(),
    state: z.string(),
    city: z.string(),
    neighborhood: z.string(),
    street: z.string()
  }),
  execute: async ({ context, resourceId, threadId }) => {
    try {
      const response = await axios.get(`https://brasilapi.com.br/api/cep/v1/${context.cep}`);
      const result = {
        cep: response.data.cep,
        state: response.data.state,
        city: response.data.city,
        neighborhood: response.data.neighborhood,
        street: response.data.street
      };
      if (resourceId && threadId) {
        await saveMessageOnThread({
          content: result,
          resourceId,
          threadId
        });
      }
      return {
        cep: response.data.cep,
        state: response.data.state,
        city: response.data.city,
        neighborhood: response.data.neighborhood,
        street: response.data.street
      };
    } catch (err) {
      console.log(err?.response?.data ?? err.message);
      return {
        cep: context.cep,
        state: "",
        city: "",
        neighborhood: "",
        street: ""
      };
    }
  }
});

export { consultingCepTool };
