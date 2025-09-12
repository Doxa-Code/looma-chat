"use client";

import { consultingCEP } from "@/app/actions/address";
import {
  createCart,
  removeProductFromCart,
  retrieveOpenCart,
  setCartAddress,
  setPaymentMethod,
  upsertProductOnCart,
} from "@/app/actions/cart";
import { listAllProducts } from "@/app/actions/products";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useServerActionQuery } from "@/hooks/server-action-hooks";
import { useCart } from "@/hooks/use-cart";
import { toast } from "@/hooks/use-toast";
import { Cart } from "@looma/core/domain/entities/cart";
import { CartProduct } from "@looma/core/domain/entities/cart-product";
import { Address } from "@looma/core/domain/value-objects/address";
import {
  PaymentMethod,
  PaymentMethodValue,
} from "@looma/core/domain/value-objects/payment-method";
import { Product } from "@looma/core/domain/value-objects/product";
import { Spinner } from "flowbite-react";
import { CreditCard, MapPin, Package, Pencil, Trash } from "lucide-react";
import React, { useState } from "react";
import AsyncSelect from "react-select/async";
import { useServerAction } from "zsa-react";
import { BadgeStatus } from "../badge-status";

interface Props {
  conversationId?: string;
}

export const ModalCart: React.FC<Props> = (props) => {
  const { data: cartRaw, refetch } = useServerActionQuery(retrieveOpenCart, {
    input: { conversationId: props.conversationId ?? "" },
    queryKey: ["retrieve-open-cart", props.conversationId],
    enabled: !!props.conversationId,
  });
  const [isAddressOpen, setAddressOpen] = useState(false);
  const [isPaymentOpen, setPaymentOpen] = useState(false);
  const [paymentMethodValue, setPaymentMethodValue] =
    useState<PaymentMethodValue>();
  const [paymentChange, setPaymentChange] = useState<number>();
  const listProductsAction = useServerAction(listAllProducts);
  const upsertProductOnCartAction = useServerAction(upsertProductOnCart);
  const setCartAddressAction = useServerAction(setCartAddress);
  const setPaymentMethodAction = useServerAction(setPaymentMethod);
  const removeProductFromCartAction = useServerAction(removeProductFromCart);
  const [newProduct, setNewProduct] = useState<{
    id: string;
    description: string;
    code: string | null;
    manufactory: string;
    price: number;
    stock: number;
    promotionPrice: number | null;
    promotionStart: Date | null;
    promotionEnd: Date | null;
    quantity: number;
  } | null>(null);
  const selectProduct = React.useRef<any>(null);
  const [cart, setCart] = useState<Cart | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const consultingCEPAction = useServerAction(consultingCEP);
  const { openCart, setOpenCart } = useCart();
  const createCartAction = useServerAction(createCart);

  React.useEffect(() => {
    if (cartRaw && typeof cartRaw !== "string") {
      setCart(Cart.instance(cartRaw));
    } else {
      setCart(null);
    }
  }, [cartRaw]);

  React.useEffect(() => {
    if (!cartRaw && props.conversationId) {
      createCartAction
        .execute({ conversationId: props.conversationId })
        .then(async () => await refetch());
    }
  }, [cartRaw, props.conversationId]);

  const handleAddProduct = async () => {
    if (!newProduct || !cart) return;

    const productToAdd = Object.assign({}, newProduct);
    setNewProduct(null);
    selectProduct.current.focus();

    cart.upsertProduct(
      CartProduct.create({
        product: Product.instance(productToAdd),
        quantity: productToAdd?.quantity || 1,
      })
    );

    setCart(Cart.instance(cart.raw()));

    await upsertProductOnCartAction.execute({
      conversationId: props.conversationId || "",
      productId: productToAdd?.id || "",
      quantity: productToAdd?.quantity || 1,
    });
  };

  const handleRemoveProduct = async (productId: string) => {
    if (!cart) return;
    try {
      cart.removeProduct(productId);
      setCart(Cart.instance(cart.raw()));
      await removeProductFromCartAction.execute({
        conversationId: props.conversationId || "",
        productId,
      });
    } catch (err) {
      toast({
        variant: "error",
        title: "Erro",
        description:
          (err as Error).message || "Erro ao remover produto do carrinho",
      });
    }
  };

  const handleSaveAddress = async () => {
    if (!cart) return;
    setAddressOpen(false);
    cart.address = address;
    setCart(Cart.instance(cart.raw()));
    setAddress(null);
    await setCartAddressAction.execute({
      address: cart.address?.raw()!,
      conversationId: props.conversationId!,
    });
  };

  const handleSavePayment = async () => {
    if (!cart) return;
    setPaymentOpen(false);
    if (!paymentMethodValue) return;
    cart.setPaymentMethod(PaymentMethod.create(paymentMethodValue));
    cart.setPaymentChange(paymentChange);
    setCart(Cart.instance(cart.raw()));
    setPaymentMethodValue(undefined);
    setPaymentChange(undefined);
    await setPaymentMethodAction.execute({
      conversationId: props.conversationId!,
      paymentMethod: cart.paymentMethod?.value!,
      paymentChange: cart.paymentChange!,
    });
  };

  return (
    <>
      <div
        data-open={openCart}
        className="absolute data-[open=false]:hidden bg-black/10 w-full h-full z-50"
        onClick={() => setOpenCart(!openCart)}
      />
      <div
        data-open={openCart}
        className="w-full data-[open=false]:translate-x-full transition-all duration-500 absolute h-full z-50 bg-white border-x shadow right-0 flex-1 border-[#E5E5E5] px-0 max-w-[30rem] overflow-y-auto"
      >
        <header className="mb-4 border-b p-4">
          <h1 className="font-semibold text-[#171616] text-lg">
            Resumo do Atendimento
          </h1>
        </header>

        <div className="mt-4 space-y-6 px-4">
          {/* Status do Pedido */}
          <section>
            <div className="flex items-center justify-start gap-2 mb-2">
              <h2 className="text-sm font-semibold text-gray-700">
                Status do Pedido
              </h2>
            </div>
            <BadgeStatus status={cart?.status?.value || "budget"} />
          </section>

          {/* Produtos */}
          <section>
            <div className="flex gap-2 items-center border-b pb-2 mb-2">
              <Package className="size-5" />
              <h2 className="text-sm font-semibold text-gray-700">Produtos</h2>
            </div>

            <table className="w-full text-sm text-gray-700">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-2 px-1 text-center font-semibold" />
                  <th className="py-2 px-1 w-full text-left font-semibold">
                    Produto
                  </th>
                  <th className="py-2 px-1 text-right font-semibold">Qtd</th>
                  <th className="py-2 px-1 text-right font-semibold">Total</th>
                  <th className="py-2 px-1 text-center font-semibold" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cart?.products.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2 px-0 text-center">{idx + 1}.</td>
                    <td className="py-2 text-sm text-nowrap pl-2">
                      {p.description}
                    </td>
                    <td className="py-2 px-3 text-right">{p.quantity}</td>
                    <td className="py-2 text-right font-medium">
                      {p.total.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </td>
                    <td className="py-2 px-0 text-center">
                      <Button
                        onClick={() => handleRemoveProduct(p.id)}
                        variant="ghost"
                      >
                        <Trash className="size-4 stroke-red-500" />
                      </Button>
                    </td>
                    <td className="py-2 px-0 text-center" />
                  </tr>
                ))}

                {/* Linha para adicionar um novo produto */}
                <tr className="bg-gray-50">
                  <td className="py-2 px-1 text-center">
                    {(cart?.products?.length || 0) + 1}.
                  </td>
                  <td className="py-2 px-1">
                    <AsyncSelect
                      ref={selectProduct}
                      cacheOptions
                      defaultOptions
                      placeholder="Selecione um produto..."
                      loadingMessage={() => "Carregando..."}
                      noOptionsMessage={() => "Nenhum produto encontrado"}
                      classNames={{
                        control: () =>
                          "!bg-white !border-1 w-full max-w-[16rem] !border-gray-400 !shadow-none",
                        input: () =>
                          "[&>input]:focus:ring-0 [&>input]:!text-nowrap",
                        indicatorsContainer: () => "!hidden",
                      }}
                      loadOptions={async (value) => {
                        const [result, err] = await listProductsAction.execute({
                          page: 1,
                          size: 5,
                          searchTerm: value,
                        });
                        if (err) return [];
                        return result.products.map((p) => ({
                          label: p.description,
                          value: p.id,
                        }));
                      }}
                      value={
                        newProduct
                          ? {
                              label: newProduct?.description || "",
                              value: newProduct?.id || "",
                            }
                          : null
                      }
                      onChange={(value) => {
                        if (value) {
                          const prod = (
                            listProductsAction?.data?.products ?? []
                          ).find((p) => p.id === value.value);
                          if (prod) {
                            setNewProduct({
                              ...prod,
                              quantity: newProduct?.quantity || 1,
                            });
                            document.getElementById("quantity")?.focus();
                            return;
                          }
                        }
                        setNewProduct(null);
                      }}
                    />
                  </td>
                  <td className="py-2 px-1 text-center">
                    <Input
                      id="quantity"
                      value={newProduct?.quantity || "0"}
                      onChange={(e) =>
                        setNewProduct((prev) =>
                          prev
                            ? {
                                ...prev,
                                quantity: isNaN(Number(e.target.value))
                                  ? 0
                                  : Number(e.target.value),
                              }
                            : null
                        )
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleAddProduct();
                        }
                      }}
                      min={1}
                      inputClassName="w-16 bg-white text-right !border-gray-400 !shadow-none !rounded"
                    />
                  </td>
                  <td className="min-w-20 font-medium max-w-20 text-right w-full truncate pl-2">
                    {newProduct?.price
                      ? (
                          newProduct?.price * (newProduct?.quantity || 1)
                        ).toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })
                      : "R$ 0,00"}
                  </td>
                  <td className="py-2 px-0 text-center" />
                </tr>
              </tbody>
            </table>
          </section>

          {/* Endereço */}
          <section>
            <div className="flex gap-2 items-center border-b pb-2 mb-2">
              <MapPin className="size-5" />
              <h2 className="text-sm font-semibold text-gray-700">Entrega</h2>
            </div>

            {cart?.address && !cart.address.isEmpty() ? (
              <p className="text-sm text-gray-600">
                {cart.address.fullAddress()}
              </p>
            ) : (
              <p className="text-xs text-gray-500 italic">
                Ainda não informado
              </p>
            )}

            {/* Botão ao final da seção */}
            <div className="flex justify-end mt-3">
              <Dialog open={isAddressOpen} onOpenChange={setAddressOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={() => {
                      setAddress(cart?.address ?? null);
                    }}
                    className="bg-sky-500"
                  >
                    <Pencil className="size-4 mr-1" /> Editar Endereço
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Alterar Endereço</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSaveAddress}>
                    <div className="flex flex-col gap-2 py-4">
                      <Label>CEP</Label>
                      <div className="flex">
                        <Input
                          value={address?.zipCode}
                          onChange={(e) =>
                            setAddress((prev) =>
                              Address.create({
                                ...(prev || {}),
                                zipCode: e.target.value,
                              })
                            )
                          }
                          placeholder="CEP"
                        />
                        <Button
                          onClick={async () => {
                            if (!address?.zipCode) return;
                            const [response] =
                              await consultingCEPAction.execute({
                                zipCode: address?.zipCode,
                              });

                            if (response) {
                              setAddress((prev) =>
                                Address.create({
                                  ...(prev || {}),
                                  ...(response || {}),
                                })
                              );
                            }
                          }}
                          className="ml-2 flex items-center gap-2"
                          disabled={consultingCEPAction.isPending}
                          type="button"
                        >
                          <Spinner
                            className="size-4"
                            data-hidden={!consultingCEPAction.isPending}
                          />
                          Buscar
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 py-4">
                      <Label>Rua</Label>
                      <Input
                        enableStepper
                        value={address?.street || ""}
                        placeholder="Rua"
                        onChange={(e) =>
                          setAddress((prev) =>
                            Address.create({
                              ...(prev || {}),
                              street: e.target.value,
                            })
                          )
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-2 py-4">
                      <Label>Número</Label>
                      <Input
                        onChange={(e) =>
                          setAddress((prev) =>
                            Address.create({
                              ...(prev || {}),
                              number: e.target.value,
                            })
                          )
                        }
                        value={address?.number || ""}
                        placeholder="Número"
                      />
                    </div>
                    <div className="flex flex-col gap-2 py-4">
                      <Label>Bairro</Label>
                      <Input
                        value={address?.neighborhood || ""}
                        placeholder="Bairro"
                        onChange={(e) =>
                          setAddress((prev) =>
                            Address.create({
                              ...(prev || {}),
                              neighborhood: e.target.value,
                            })
                          )
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-2 py-4">
                      <Label>Cidade</Label>
                      <Input
                        onChange={(e) =>
                          setAddress((prev) =>
                            Address.create({
                              ...(prev || {}),
                              city: e.target.value,
                            })
                          )
                        }
                        value={address?.city || ""}
                        placeholder="Cidade"
                      />
                    </div>
                    <div className="flex flex-col gap-2 py-4">
                      <Label>Estado</Label>
                      <Input
                        onChange={(e) =>
                          setAddress((prev) =>
                            Address.create({
                              ...(prev || {}),
                              state: e.target.value,
                            })
                          )
                        }
                        value={address?.state || ""}
                        placeholder="Estado"
                      />
                    </div>
                    <div className="flex flex-col gap-2 py-4">
                      <Label>Complemento</Label>
                      <Input
                        value={address?.note || ""}
                        placeholder="Complemento"
                        onChange={(e) =>
                          setAddress((prev) =>
                            Address.create({
                              ...(prev || {}),
                              note: e.target.value,
                            })
                          )
                        }
                      />
                    </div>
                    <Button
                      className="w-full !bg-sky-500"
                      onClick={handleSaveAddress}
                    >
                      Salvar Endereço
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </section>

          {/* Pagamento */}
          <section>
            <div className="flex gap-2 items-center border-b pb-2 mb-2">
              <CreditCard className="size-5" />
              <h2 className="text-sm font-semibold text-gray-700">Pagamento</h2>
            </div>

            {cart?.paymentMethod ? (
              <div className="text-sm text-gray-600 space-y-1">
                <p>{cart.paymentMethod.formatted}</p>
                {cart.paymentChange && (
                  <p className="text-xs text-gray-500">
                    Troco para{" "}
                    {cart.paymentChange.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-500 italic">
                Ainda não informado
              </p>
            )}

            {/* Botão ao final da seção */}
            <div className="flex justify-end mt-3">
              <Dialog open={isPaymentOpen} onOpenChange={setPaymentOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="bg-sky-500"
                    onClick={() => {
                      setPaymentMethodValue(
                        (cart?.paymentMethod?.value as PaymentMethodValue) ||
                          undefined
                      );
                      setPaymentChange(cart?.paymentChange || undefined);
                    }}
                  >
                    <Pencil className="size-4 mr-1" /> Editar Pagamento
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Forma de Pagamento</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSavePayment} className="space-y-4">
                    <div>
                      <Label>Método</Label>
                      <Select
                        onValueChange={(value) => {
                          setPaymentMethodValue(value as PaymentMethodValue);
                          setPaymentChange(undefined);
                        }}
                        value={paymentMethodValue}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um método" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CASH">Dinheiro</SelectItem>
                          <SelectItem value="CREDIT_CARD">
                            Cartão de crédito
                          </SelectItem>
                          <SelectItem value="DEBIT_CARD">
                            Cartão de débito
                          </SelectItem>
                          <SelectItem value="CHECK">Cheque</SelectItem>
                          <SelectItem value="DIGITAL_PAYMENT">Pix</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {paymentMethodValue === "CASH" && (
                      <div>
                        <Label>Troco para</Label>
                        <Input
                          type="number"
                          value={paymentChange ?? ""}
                          onChange={(e) =>
                            setPaymentChange(Number(e.target.value))
                          }
                          placeholder="Valor em R$"
                        />
                      </div>
                    )}

                    <Button
                      className="w-full bg-sky-500"
                      onClick={handleSavePayment}
                    >
                      Salvar Pagamento
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </section>

          {/* Total */}
          <section>
            <div className="flex justify-between items-center text-sm font-semibold text-gray-700">
              <span>Total</span>
              <span className="text-xl text-sky-500">
                {cart
                  ? cart.total.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })
                  : "R$ 0,00"}
              </span>
            </div>
          </section>
        </div>
      </div>
    </>
  );
};
