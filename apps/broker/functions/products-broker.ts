import { Product } from "@looma/core/domain/value-objects/product";
import { pgVector } from "@looma/core/infra/ai/config/vectors/pg-vector";
import { ProductsDatabaseRepository } from "@looma/core/infra/repositories/products-repository";
import { SettingsDatabaseRepository } from "@looma/core/infra/repositories/settings-repository";
import type { SQSEvent, SQSHandler } from "aws-lambda";
import z from "zod";
import { createEmbedding } from "../helpers/vector-store";

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
  const productsRepository = ProductsDatabaseRepository.instance();
  const settingsRepository = SettingsDatabaseRepository.instance();

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

    console.log(product);

    const productAlreadyExists = await productsRepository.retrieve(product.id);
    if (
      !productAlreadyExists ||
      product.description !== productAlreadyExists.description
    ) {
      const indexes = await pgVector.listIndexes();
      const productsVectorName = `products-${settings.vectorNamespace}`.replace(
        /-/gim,
        "_"
      );

      if (!indexes.includes(productsVectorName)) {
        await pgVector.createIndex({
          dimension: 1536,
          indexName: productsVectorName,
        });
      }

      console.log(
        `${product.id} - Embedando descrição do produto, ${productAlreadyExists?.description ?? "Produto não existe"}, ${product.description}`
      );
      const { embedding } = await createEmbedding(product.description);
      await pgVector.upsert({
        indexName: productsVectorName,
        vectors: [embedding],
        ids: [product.id],
        metadata: [
          {
            id: product.id,
            description: product.description,
          },
        ],
      });
    }

    await productsRepository.upsert(product, result.data.workspaceId);
  }
};
