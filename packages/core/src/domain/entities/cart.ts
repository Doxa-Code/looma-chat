import {
  PaymentMethod,
  PaymentMethodValue,
} from "./../value-objects/payment-method";
import { Address, AddressRaw } from "../value-objects/address";
import { Attendant, AttendantRaw } from "../value-objects/attendant";
import { CartProduct } from "./cart-product";
import { Client } from "./client";
import { Status, StatusValue } from "../value-objects/status";

export namespace Cart {
  export interface Props {
    id: string;
    client: Client;
    attendant: Attendant;
    products: CartProduct[];
    address: Address | null;
    status: Status;
    createdAt: Date;
    orderedAt: Date | null;
    expiredAt: Date | null;
    finishedAt: Date | null;
    canceledAt: Date | null;
    paymentMethod: PaymentMethod | null;
    paymentChange: number | null;
  }

  export interface Raw {
    id: string;
    client: Client.Raw;
    attendant: AttendantRaw;
    products: CartProduct.Raw[];
    address: AddressRaw | null;
    status: StatusValue;
    createdAt: Date;
    orderedAt: Date | null;
    expiredAt: Date | null;
    finishedAt: Date | null;
    canceledAt: Date | null;
    paymentMethod: PaymentMethodValue | null;
    paymentChange: number | null;
  }

  export interface CreateProps {
    attendant: Attendant;
    client: Client;
  }
}

export class Cart {
  public id: string;
  public client: Client;
  public attendant: Attendant;
  private _products: Map<string, CartProduct>;
  private _address: Address | null;
  public status: Status;
  public createdAt: Date;
  public orderedAt: Date | null;
  public expiredAt: Date | null;
  public finishedAt: Date | null;
  public canceledAt: Date | null;
  public paymentMethod: PaymentMethod | null;
  public paymentChange: number | null;

  constructor(props: Cart.Props) {
    this.id = props.id;
    this.client = props.client;
    this.attendant = props.attendant;
    this.products = props.products;
    this.address = props.address;
    this.status = props.status;
    this.createdAt = props.createdAt;
    this.orderedAt = props.orderedAt;
    this.expiredAt = props.expiredAt;
    this.finishedAt = props.finishedAt;
    this.canceledAt = props.canceledAt;
    this.paymentMethod = props.paymentMethod;
    this.paymentChange = props.paymentChange;
  }

  set address(address: Address | null) {
    this._address = address;
  }

  get address() {
    return this._address ?? this.client.address;
  }

  set products(products: CartProduct[]) {
    if (!this._products) {
      this._products = new Map();
    }
    for (const product of products) {
      this._products.set(product.id, product);
    }
  }

  get products() {
    return Array.from(this._products.values());
  }

  get total() {
    return this.products.reduce((sum, p) => sum + p.price * p.quantity, 0);
  }

  upsertProduct(product: CartProduct) {
    this._products.set(product.id, product);
  }

  setPaymentMethod(method: PaymentMethod) {
    this.paymentMethod = method;
  }

  orderCart() {
    this.status = Status.create("order");
    this.orderedAt = new Date();
  }

  expireCart() {
    this.status = Status.create("expired");
    this.expiredAt = new Date();
  }

  finish() {
    this.status = Status.create("finished");
    this.finishedAt = new Date();
  }

  cancelCart() {
    this.status = Status.create("canceled");
    this.canceledAt = new Date();
  }

  removeCartProduct(productId: string) {
    if (!this._products.has(productId)) {
      throw new Error(`CartProduct ${productId} not found`);
    }
    return this._products.delete(productId);
  }

  get formatted() {
    return `
*Resumo do pedido*:
      
*Lista de Produtos*:
${this.products
  .map(
    (p) =>
      `- ${p.description} - ${p.quantity} x ${p.price.toLocaleString("pt-BR", {
        currency: "BRL",
        style: "currency",
      })} = ${
        p.total.toLocaleString("pt-BR", {
          currency: "BRL",
          style: "currency",
        }) ?? "Sem produtos no pedido"
      }`
  )
  .join("\n")}

*Informações de entrega*:
${
  this.address?.isEmpty() || !this.address
    ? "Ainda não informado"
    : this.address?.fullAddress()
}
      
*Informações de Pagamento*:
${this.paymentMethod?.formatted || "Ainda não informado"} ${
      this.paymentChange
        ? `(Troco para ${this.paymentChange.toLocaleString("pt-BR", {
            currency: "BRL",
            style: "currency",
          })})`
        : ""
    }

*Valor Total*:
${this.total.toLocaleString("pt-BR", {
  currency: "BRL",
  style: "currency",
})}

*Status do pedido*
${this.status.formatted}
`.trim();
  }

  setPaymentChange(paymentChange?: number) {
    this.paymentChange = paymentChange ?? null;
  }

  static create(props: Cart.CreateProps) {
    if (!props.client || !props.attendant) {
      throw new Error("Informações faltando, verifique.");
    }

    return new Cart({
      id: crypto.randomUUID().toString(),
      client: props.client,
      products: [],
      attendant: props.attendant,
      address: null,
      status: Status.create("budget"),
      createdAt: new Date(),
      orderedAt: null,
      expiredAt: null,
      finishedAt: null,
      canceledAt: null,
      paymentMethod: null,
      paymentChange: null,
    });
  }

  static instance(props: Cart.Props) {
    return new Cart(props);
  }

  raw(): Cart.Raw {
    return {
      id: this.id,
      client: this.client,
      attendant: this.attendant,
      products: this.products,
      address: this.address ? this.address.raw() : null,
      status: this.status.raw(),
      createdAt: this.createdAt,
      orderedAt: this.orderedAt,
      expiredAt: this.expiredAt,
      finishedAt: this.finishedAt,
      canceledAt: this.canceledAt,
      paymentMethod: this.paymentMethod?.raw() ?? null,
      paymentChange: this.paymentChange ?? null,
    };
  }
}
