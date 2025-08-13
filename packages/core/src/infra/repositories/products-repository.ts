import { Product } from "@looma/core/domain/value-objects/product";
import { and, asc, eq, ilike, inArray, isNotNull } from "drizzle-orm";
import { createDatabaseConnection } from "../database";
import { products } from "../database/schemas";

type ListProps = {
  page: number;
  pageSize: number;
  workspaceId: string;
  searchTerm?: string;
};

export class ProductsRepository {
  async upsert(product: Product, workspaceId: string) {
    const db = createDatabaseConnection();
    await db
      .insert(products)
      .values({
        ...product.raw(),
        workspaceId,
      })
      .onConflictDoUpdate({
        target: products.id,
        set: {
          ...product.raw(),
          workspaceId,
        },
      });
  }

  async listByIds(
    ids: string[],
    workspaceId: string
  ): Promise<Product.Props[]> {
    const db = createDatabaseConnection();

    const list = await db
      .select()
      .from(products)
      .where(
        and(inArray(products.id, ids), eq(products.workspaceId, workspaceId))
      );

    return list.map((item) => ({
      ...item,
      price: item.price / 100,
      promotionPrice: item.promotionPrice ? item.promotionPrice / 100 : 0,
    }));
  }
  async retrieve(id: string): Promise<Product | null> {
    const db = createDatabaseConnection();

    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, id));

    if (!product) return null;

    return Product.instance({
      description: product.description,
      id: product.id,
      price: product.price / 100,
      manufactory: product.manufactory,
      stock: product.stock,
      code: product.code,
      promotionEnd: product.promotionEnd,
      promotionPrice: product.promotionPrice
        ? product.promotionPrice / 100
        : null,
      promotionStart: product.promotionStart,
    });
  }

  async list(
    props: ListProps
  ): Promise<{ products: Product.Props[]; total: number }> {
    const { page = 1, pageSize = 20, workspaceId, searchTerm } = props;
    if (!workspaceId)
      return {
        products: [],
        total: 0,
      };

    const db = createDatabaseConnection();

    const offset = page > 0 ? (page - 1) * pageSize : 0;

    const response = await db
      .select()
      .from(products)
      .where(
        searchTerm
          ? and(
              eq(products.workspaceId, workspaceId),
              ilike(products.description, `%${searchTerm}%`)
            )
          : eq(products.workspaceId, workspaceId)
      )
      .orderBy(asc(products.description))
      .limit(pageSize)
      .offset(offset);

    const totalRows = searchTerm
      ? (
          await db
            .select()
            .from(products)
            .where(
              and(
                eq(products.workspaceId, workspaceId),
                ilike(products.description, `%${searchTerm}%`)
              )
            )
        ).length
      : await db.$count(products);

    const total = Math.ceil(totalRows / pageSize);

    return {
      products: response.map((item) => ({
        ...item,
        price: item.price / 100,
        promotionPrice: item.promotionPrice ? item.promotionPrice / 100 : 0,
      })),
      total,
    };
  }

  async listPromotionByIds(
    ids: string[],
    workspaceId: string
  ): Promise<Product.Props[]> {
    const db = createDatabaseConnection();

    const list = await db
      .select()
      .from(products)
      .where(
        and(
          inArray(products.id, ids),
          eq(products.workspaceId, workspaceId),
          isNotNull(products.promotionEnd)
        )
      );

    return list.map((item) => ({
      ...item,
      price: item.price / 100,
      promotionPrice: item.promotionPrice ? item.promotionPrice / 100 : 0,
    }));
  }
  static instance() {
    return new ProductsRepository();
  }
}
