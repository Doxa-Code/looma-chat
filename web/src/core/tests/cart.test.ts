import { Cart } from "@/core/entities/cart";
import { Contact } from "../value-objects/contact";
import { Attendant } from "../value-objects/attendant";
import { Product } from "../entities/product";
import { InvalidValue } from "../errors/invalid-value";

describe("Cart", () => {
  let cart: Cart;

  const contact = Contact.create(
    "19999999999", "Lucas"
  );

  const attendant = Attendant.create(
    crypto.randomUUID().toString(),
    "Fernando"
  )

  const produtosTeste = [
    Product.create({
      id: crypto.randomUUID().toString(),
      description: "Produto Teste1",
      price: 1020,
      quantity: 2,
    }),
    Product.create({
      id: crypto.randomUUID().toString(),
      description: "Produto Teste2",
      price: 3050,
      quantity: 0,
    }),
  ];

  beforeAll(() => {
    cart = Cart.create({
      contact,
      attendant,
      conversationId: crypto.randomUUID().toString(),
    });
  });

  test("Deve criar um cart com as chaves esperadas e sem produtos", () => {
    expect(cart.products.length).toBe(0);
    expect(cart.status).toBe("budget");
    expect(cart).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        contact: expect.any(Object),
        conversationId: expect.any(String),
        attendant: expect.any(Object),
        products: expect.any(Array),
      })
    );
  });

  test("Deve adicionar produtos ao cart", () => {
    cart.upsertProduct(produtosTeste[0]);
    cart.upsertProduct(produtosTeste[1]);

    expect(Array.isArray(cart.products)).toBe(true);
    expect(cart.products.length).toBe(2);
    expect(cart.products).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          description: expect.any(String),
          price: expect.any(Number),
          quantity: expect.any(Number),
        }),
      ])
    );
  });

  test("Deve calcular o valor total", () => {
    const valorTotal = cart.total;
    const valorRef = cart.products.reduce((acc, product) => {
      return acc + product.price * product.quantity;
    }, 0);

    expect(valorTotal).toBe(valorRef);
  });

  test("Deve remover o produto", () => {
    cart.removeProduct(produtosTeste[0].id);

    expect(Array.isArray(cart.products)).toBe(true);
    expect(cart.products.length).toBe(1);
    expect(
      cart.products.some((product) => product.id === produtosTeste[0].id)
    ).toBe(false);
  });

  test("Deve alterar a quantidade do produto", () => {
    produtosTeste[1].changeQuantity(3)
    cart.upsertProduct(produtosTeste[1]);

    expect(cart.products[0].quantity).toBe(3);
  });

  test("Deve retornar erro ao tentar alterar o status do cart com um valor inválido", () => {
    expect(() => cart.changeStatus("valor inválido" as any)).toThrowError(InvalidValue.throw());
  });

  test("Deve alterar o status do cart", () => {
    cart.changeStatus("finished");

    expect(cart.status).toBe("finished");
  });
});
