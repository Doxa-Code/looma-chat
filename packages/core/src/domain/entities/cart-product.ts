import { InvalidCreation } from "../errors/invalid-creation";
import { Product } from "../value-objects/product";

export namespace CartProduct {
  export interface Props {
    id: string;
    description: string;
    price: number;
    realPrice: number;
    quantity: number;
  }

  export interface Raw {
    id: string;
    description: string;
    price: number;
    realPrice: number;
    quantity: number;
  }

  export interface CreateProps {
    product: Product;
    quantity?: number;
  }
}

export class CartProduct {
  public id: string;
  public description: string;
  public price: number;
  public realPrice: number;
  public quantity: number;

  constructor(props: CartProduct.Props) {
    this.id = props.id;
    this.description = props.description;
    this.price = props.price;
    this.realPrice = props.realPrice;
    this.quantity = props.quantity;
  }

  raw() {
    return {
      id: this.id,
      description: this.description,
      price: this.price,
      realPrice: this.realPrice,
      quantity: this.quantity,
    };
  }

  get total() {
    return this.price * this.quantity;
  }

  changeQuantity(quantity: number) {
    this.quantity = quantity;
  }

  static instance(props: CartProduct.Props) {
    return new CartProduct(props);
  }

  static create(props: CartProduct.CreateProps) {
    if (!props.product) {
      throw InvalidCreation.throw();
    }

    return new CartProduct({
      id: props.product.id,
      description: props.product.description,
      price: props.product.promotionPrice ?? props.product.price,
      quantity: props.quantity ? (props.quantity > 0 ? props.quantity : 1) : 1,
      realPrice: props.product.price,
    });
  }
}
