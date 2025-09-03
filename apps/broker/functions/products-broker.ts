import { Product } from "@looma/core/domain/value-objects/product";
import { createDatabaseConnection } from "@looma/core/infra/database";
import { products } from "@looma/core/infra/database/schemas";
import { ProductsDatabaseRepository } from "@looma/core/infra/repositories/products-repository";
import { SettingsDatabaseRepository } from "@looma/core/infra/repositories/settings-repository";
import type { SQSEvent, SQSHandler } from "aws-lambda";
import z from "zod";
import { createEmbedding } from "../helpers/vector-store";
import axios from "axios";

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
    promotionStart: z.string().nullable(),
    promotionEnd: z.string().nullable(),
  }),
});

export const handler: SQSHandler = async (event: SQSEvent) => {
  const productsRepository = ProductsDatabaseRepository.instance();
  const settingsRepository = SettingsDatabaseRepository.instance();
  const db = createDatabaseConnection();

  for (const record of event.Records) {
    const body = JSON.parse(record.body) as Product.Props;
    const result = await productValidate.safeParseAsync(body);

    if (!result.success) {
      console.log({
        error: result.error,
        body: record.body,
      });
      continue;
    }

    const settings = await settingsRepository.retrieveSettingsByWorkspaceId(
      result.data.workspaceId
    );

    if (!settings?.vectorNamespace) {
      console.log("Vector store namespace");
      continue;
    }

    const productionDescription = await axios.post(
      "https://n8n.doxacode.com.br/webhook/978a1a87-669d-4094-98de-8248ed0f92af",
      {
        description: result?.data?.product?.description,
      }
    );

    const product = Product.instance({
      ...result.data.product,
      description:
        productionDescription?.data?.description ??
        result?.data?.product.description,
      promotionStart: result?.data?.product?.promotionStart
        ? new Date(result.data.product.promotionStart)
        : null,
      promotionEnd: result.data.product.promotionEnd
        ? new Date(result.data.product.promotionEnd)
        : null,
    });

    const productAlreadyExists = await productsRepository.retrieve(
      product.id,
      result.data.workspaceId
    );

    const insertData: Product.Props & {
      workspaceId: string;
      embedding?: number[];
    } = {
      ...product.raw(),
      workspaceId: result.data.workspaceId,
    };

    if (
      !productAlreadyExists ||
      product.description !== productAlreadyExists.description
    ) {
      const value = `${product.description} | ${product.manufactory}`;
      const { embedding } = await createEmbedding(value);
      insertData.embedding = embedding;
      console.log(`${value} - Embeddando descrição do produto`);
    }

    await db
      .insert(products)
      .values(insertData)
      .onConflictDoUpdate({
        target: [products.id, products.workspaceId],
        set: insertData,
      });
  }
};
