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
    shippedAt: Date | null;
    processingAt: Date | null;
    paymentMethod: PaymentMethod | null;
    paymentChange: number | null;
    cancelReason: string | null;
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
    shippedAt: Date | null;
    processingAt: Date | null;
    paymentMethod: PaymentMethodValue | null;
    paymentChange: number | null;
    cancelReason: string | null;
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
  public processingAt: Date | null;
  public shippedAt: Date | null;
  public paymentMethod: PaymentMethod | null;
  public paymentChange: number | null;
  public cancelReason: string | null;

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
    this.shippedAt = props.shippedAt;
    this.canceledAt = props.canceledAt;
    this.processingAt = props.processingAt;
    this.paymentMethod = props.paymentMethod;
    this.paymentChange = props.paymentChange;
    this.cancelReason = props.cancelReason;
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
    if (
      this.status.is("finished") ||
      this.status.is("expired") ||
      this.status.is("shipped") ||
      this.status.is("processing")
    ) {
      throw new Error(
        "O pedido já está fechado e já não pode mais adicionar produtos"
      );
    }
    this._products.set(product.id, product);
  }

  setPaymentMethod(method: PaymentMethod) {
    this.paymentMethod = method;
  }

  order() {
    if (!this.address)
      throw new Error("Não é possível finalizar o pedido sem um endereço.");

    const validateAddress = this.address.validate();
    if (!validateAddress.isValid)
      throw new Error(`
        Não é possível finalizar o pedido com o endereço incompleto.
        Campos faltantes: ${validateAddress.missingFields}
      `);

    if (!this.paymentMethod) throw new Error("Defina um método de pagamento.");

    if (!this.products.length)
      throw new Error(`
        Não é possível finalizar o pedido sem nenhum produto adicionado.
      `);

    this.status = Status.create("order");
    this.orderedAt = new Date();
  }

  expire() {
    this.status = Status.create("expired");
    this.expiredAt = new Date();
  }

  finish() {
    this.status = Status.create("finished");
    this.finishedAt = new Date();
  }

  cancel(reason?: string) {
    this.status = Status.create("cancelled");
    this.canceledAt = new Date();
    this.cancelReason = reason ?? "Não informado";
  }

  processing() {
    this.status = Status.create("processing");
    this.processingAt = new Date();
  }

  shipped() {
    this.status = Status.create("shipped");
    this.shippedAt = new Date();
  }

  removeProduct(productId: string) {
    if (
      this.status.is("finished") ||
      this.status.is("expired") ||
      this.status.is("shipped") ||
      this.status.is("processing")
    ) {
      throw new Error(
        "O pedido já está fechado e já não pode mais remover produtos"
      );
    }
    return this._products.delete(productId);
  }

  get formatted() {
    return `
*Resumo do pedido*:
      
*Lista de Produtos*:
${
  this.products.length
    ? this.products
        .map(
          (p) =>
            `- ${p.description} - ${p.quantity} x ${p.price.toLocaleString(
              "pt-BR",
              {
                currency: "BRL",
                style: "currency",
              }
            )} = ${
              p.total.toLocaleString("pt-BR", {
                currency: "BRL",
                style: "currency",
              }) ?? "Sem produtos no pedido"
            }`
        )
        .join("\n")
    : "Nenhum produto"
}

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
`.trim();
  }

  setPaymentChange(paymentChange?: number) {
    this.paymentChange = paymentChange ?? null;
  }

  hasProduct(productId: string) {
    return this._products.has(productId);
  }

  static create(props: Cart.CreateProps) {
    if (!props.client || !props.attendant) {
      throw new Error(
        `Informações faltando, verifique: client: ${JSON.stringify(props.client ?? "{}", null, 2)} | attendant: ${JSON.stringify(props.attendant ?? "{}", null, 2)}`
      );
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
      cancelReason: null,
      processingAt: null,
      shippedAt: null,
    });
  }

  static instance(props: Cart.Raw) {
    return new Cart({
      address: props.address ? Address.create(props.address) : null,
      attendant: Attendant.create(props.attendant.id, props.attendant.name),
      canceledAt: props.canceledAt,
      client: Client.instance(props.client),
      createdAt: props.createdAt,
      expiredAt: props.expiredAt,
      finishedAt: props.finishedAt,
      id: props.id,
      orderedAt: props.orderedAt,
      paymentChange: props.paymentChange,
      paymentMethod: props.paymentMethod
        ? PaymentMethod.create(props.paymentMethod)
        : null,
      products: props.products.map((p) => CartProduct.instance(p)),
      status: Status.create(props.status),
      cancelReason: props.cancelReason,
      processingAt: props.processingAt,
      shippedAt: props.shippedAt,
    });
  }

  raw(): Cart.Raw {
    return {
      id: this.id,
      client: this.client.raw(),
      attendant: this.attendant.raw(),
      products: this.products.map((p) => p.raw()),
      address: this.address?.raw?.() ?? null,
      status: this.status.raw(),
      createdAt: this.createdAt,
      orderedAt: this.orderedAt,
      expiredAt: this.expiredAt,
      finishedAt: this.finishedAt,
      canceledAt: this.canceledAt,
      shippedAt: this.shippedAt,
      paymentMethod: this.paymentMethod?.raw() ?? null,
      paymentChange: this.paymentChange ?? null,
      cancelReason: this.cancelReason ?? null,
      processingAt: this.processingAt ?? null,
    };
  }
}
