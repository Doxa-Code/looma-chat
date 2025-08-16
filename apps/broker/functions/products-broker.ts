import type { SQSEvent, SQSHandler } from "aws-lambda";
import { Product } from "@looma/core/domain/value-objects/product";
import z from "zod";
import { ProductsRepository } from "@looma/core/infra/repositories/products-repository";
import { createEmbedding, createPineconeClient } from "../helpers/vector-store";
import { SettingsRepository } from "@looma/core/infra/repositories/settings-repository";

const productValidate = z.object({
  workspaceId: z.string(),
  product: z.object({
    id: z.string(),
    description: z.string(),
    code: z.string().nullable(),
    manufactory: z.string(),
    price: z.number(),
    stock: z.number(),
    promotionPrice: z.number().nullable(),
    promotionStart: z.date().nullable(),
    promotionEnd: z.date().nullable(),
  }),
});

export const handler: SQSHandler = async (event: SQSEvent) => {
  const productsRepository = ProductsRepository.instance();
  const settingsRepository = SettingsRepository.instance();

  for (const record of event.Records) {
    const body = JSON.parse(record.body) as Product.Props;
    const result = await productValidate.safeParseAsync(body);

    if (!result.success) {
      console.log({
        error: result.error,
        body: record.body,
      });
      return;
    }

    const settings = await settingsRepository.retrieveSettingsByWorkspaceId(
      result.data.workspaceId
    );

    if (!settings?.vectorNamespace) {
      console.log("Vector store namespace");
      return;
    }

    const product = Product.instance(result.data.product);

    const productAlreadyExists = await productsRepository.retrieve(product.id);
    if (
      !productAlreadyExists ||
      product.description !== productAlreadyExists.description
    ) {
      console.log(
        `${product.id} - Embedando descrição do produto, ${productAlreadyExists?.description ?? "Produto não existe"}, ${product.description}`
      );
      const vectorStore = createPineconeClient(settings?.vectorNamespace!);
      const { embedding } = await createEmbedding(product.description);
      await vectorStore.upsert([
        {
          id: product.id,
          values: embedding,
          metadata: {
            id: product.id,
            description: product.description,
            manufactory: product.manufactory,
          },
        },
      ]);
    }

    await productsRepository.upsert(product, result.data.workspaceId);
  }
};
