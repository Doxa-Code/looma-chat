export namespace Product {
  export interface Props {
    id: string;
    description: string;
    code: string | null;
    manufactory: string;
    price: number;
    stock: number;
    promotionPrice: number | null;
    promotionStart: Date | null;
    promotionEnd: Date | null;
  }
}

export class Product {
  public readonly id: string;
  public readonly description: string;
  public readonly code: string | null;
  public readonly manufactory: string;
  public readonly price: number;
  public readonly stock: number;
  public readonly promotionPrice: number | null;
  public readonly promotionStart: Date | null;
  public readonly promotionEnd: Date | null;

  constructor(props: Product.Props) {
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
      promotionEnd: this.promotionEnd,
    };
  }

  static instance(props: Product.Props) {
    return new Product(props);
  }
}
