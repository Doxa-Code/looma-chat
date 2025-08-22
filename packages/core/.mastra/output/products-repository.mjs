import { and, inArray, eq, ilike, asc, count, isNotNull } from 'drizzle-orm';
import { c as createDatabaseConnection, h as products } from './schemas.mjs';

class Product {
  id;
  description;
  code;
  manufactory;
  price;
  stock;
  promotionPrice;
  promotionStart;
  promotionEnd;
  constructor(props) {
    this.id = props.id;
    this.description = props.description;
    this.code = props.code;
    this.manufactory = props.manufactory;
    this.price = props.price;
    this.stock = props.stock;
    this.promotionPrice = props.promotionPrice;
    this.promotionStart = props.promotionStart;
    this.promotionEnd = props.promotionEnd;
  }
  raw() {
    return {
      id: this.id,
      description: this.description,
      code: this.code,
      manufactory: this.manufactory,
      price: this.price,
      stock: this.stock,
      promotionPrice: this.promotionPrice,
      promotionStart: this.promotionStart,
      promotionEnd: this.promotionEnd
    };
  }
  static instance(props) {
    return new Product(props);
  }
}

class ProductsDatabaseRepository {
  async upsert(product, workspaceId) {
    const db = createDatabaseConnection();
    await db.insert(products).values({
      ...product.raw(),
      workspaceId
    }).onConflictDoUpdate({
      target: [products.id, products.workspaceId],
      set: {
        ...product.raw(),
        workspaceId
      }
    });
  }
  async listByIds(ids, workspaceId) {
    const db = createDatabaseConnection();
    const list = await db.select().from(products).where(
      and(inArray(products.id, ids), eq(products.workspaceId, workspaceId))
    );
    return list.map((item) => ({
      ...item,
      price: item.price / 100,
      promotionPrice: item.promotionPrice ? item.promotionPrice / 100 : 0
    }));
  }
  async retrieve(id) {
    const db = createDatabaseConnection();
    const [product] = await db.select().from(products).where(eq(products.id, id));
    if (!product) return null;
    return Product.instance({
      description: product.description,
      id: product.id,
      price: product.price / 100,
      manufactory: product.manufactory,
      stock: product.stock,
      code: product.code,
      promotionEnd: product.promotionEnd,
      promotionPrice: product.promotionPrice ? product.promotionPrice / 100 : null,
      promotionStart: product.promotionStart
    });
  }
  async list(props) {
    const { page = 1, pageSize = 20, workspaceId, searchTerm } = props;
    if (!workspaceId)
      return {
        products: [],
        total: 0
      };
    const db = createDatabaseConnection();
    const offset = page > 0 ? (page - 1) * pageSize : 0;
    const [response, [counter]] = await Promise.all([
      db.select().from(products).where(
        searchTerm ? and(
          eq(products.workspaceId, workspaceId),
          ilike(products.description, `%${searchTerm}%`)
        ) : eq(products.workspaceId, workspaceId)
      ).orderBy(asc(products.description)).limit(pageSize).offset(offset),
      db.select({
        count: count(products.id)
      }).from(products).where(
        searchTerm ? and(
          eq(products.workspaceId, workspaceId),
          ilike(products.description, `%${searchTerm}%`)
        ) : eq(products.workspaceId, workspaceId)
      )
    ]);
    const totalRows = counter?.count ?? 1;
    const total = Math.ceil(totalRows / pageSize);
    return {
      products: response.map((item) => ({
        ...item,
        price: item.price / 100,
        promotionPrice: item.promotionPrice ? item.promotionPrice / 100 : 0
      })),
      total
    };
  }
  async listPromotionByIds(ids, workspaceId) {
    const db = createDatabaseConnection();
    const list = await db.select().from(products).where(
      and(
        inArray(products.id, ids),
        eq(products.workspaceId, workspaceId),
        isNotNull(products.promotionEnd)
      )
    );
    return list.map((item) => ({
      ...item,
      price: item.price / 100,
      promotionPrice: item.promotionPrice ? item.promotionPrice / 100 : 0
    }));
  }
  static instance() {
    return new ProductsDatabaseRepository();
  }
}

export { ProductsDatabaseRepository as P };
