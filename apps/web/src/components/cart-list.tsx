"use client";
import { listCarts } from "@/app/actions/cart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useServerActionQuery } from "@/hooks/server-action-hooks";
import { Cart } from "@looma/core/domain/entities/cart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
} from "flowbite-react";
import {
  Clock,
  CreditCard,
  Eye,
  File,
  Link,
  ListOrderedIcon,
  MapPin,
  Package,
  Phone,
} from "lucide-react";
import { useState } from "react";
import { BadgeStatus } from "./badge-status";
import { EmptyState } from "./empty-state";
import { Separator } from "./ui/separator";

interface CartListProps {
  initCartsRaw: Cart.Raw[];
}

export function CartList({ initCartsRaw }: CartListProps) {
  const { data: cartsRaw } = useServerActionQuery(listCarts, {
    input: undefined,
    queryKey: ["list-carts"],
    initialData: initCartsRaw,
  });
  const carts = cartsRaw.map((c) => Cart.instance(c));
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState<Cart | null>(null);
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (carts.length === 0) {
    return (
      <EmptyState
        title="Não há pedidos realizados ainda"
        description="Os pedidos realizados apareceram aqui."
        icons={[ListOrderedIcon, Link, File]}
      />
    );
  }

  return (
    <div className="border bg-white rounded shadow">
      <Table>
        <TableHead className="border-b">
          <TableRow>
            <TableHeadCell>Cliente</TableHeadCell>
            <TableHeadCell>Telefone</TableHeadCell>
            <TableHeadCell>Status</TableHeadCell>
            <TableHeadCell>Produtos</TableHeadCell>
            <TableHeadCell>Bairro</TableHeadCell>
            <TableHeadCell>Data</TableHeadCell>
            <TableHeadCell>Total</TableHeadCell>
            <TableHeadCell className="text-right">Ações</TableHeadCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {carts.map((cart) => (
            <TableRow key={cart.id} className="hover:bg-muted/50">
              <TableCell className="font-medium">
                {cart.client.contact.name}
              </TableCell>
              <TableCell>{cart.client.contact.phone}</TableCell>
              <TableCell>
                <BadgeStatus status={cart.status.value} />
              </TableCell>
              <TableCell>
                {cart.products.length}{" "}
                {cart.products.length === 1 ? "produto" : "produtos"}
              </TableCell>
              <TableCell>{cart.address?.neighborhood}</TableCell>
              <TableCell>{formatDate(cart.createdAt.toISOString())}</TableCell>
              <TableCell className="font-semibold text-primary">
                {formatCurrency(cart.total)}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  onClick={() => {
                    setCart(cart);
                    setOpen(true);
                  }}
                  className="gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Ver detalhes
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog
        open={open}
        onOpenChange={(state) => {
          setOpen(state);
          if (!state) {
            setCart(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto text-sm">
          <DialogHeader>
            <div className="flex items-center justify-between pb-2">
              <DialogTitle className="text-lg font-bold">
                Resumo do pedido
              </DialogTitle>
              <BadgeStatus status={cart?.status.value!} />
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Informações do Cliente */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Phone className="h-4 w-4" />
                  Informações do Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                <div>
                  <span className="font-medium text-xs">Nome:</span>
                  <p className="text-sm">{cart?.client.contact.name}</p>
                </div>
                <div>
                  <span className="font-medium text-xs">Telefone:</span>
                  <p className="text-sm">{cart?.client.contact.phone}</p>
                </div>
              </CardContent>
            </Card>

            {/* Informações de Entrega */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4" />
                  Informações de Entrega
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                <p className="text-sm">{cart?.address?.fullAddress()}</p>
              </CardContent>
            </Card>

            {/* Produtos */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="h-4 w-4" />
                  Produtos
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {!cart?.products?.length ? (
                    <span>Não há produtos ainda</span>
                  ) : (
                    cart?.products.map((product) => (
                      <div key={product.id} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">
                              {product.description}
                            </h4>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-sm">
                              {formatCurrency(product.price)} x{" "}
                              {product.quantity}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Total:{" "}
                              {formatCurrency(product.price * product.quantity)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Informações de Pagamento */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-4 w-4" />
                  Informações de Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                <div>
                  <span className="font-medium text-xs">Método:</span>
                  <p className="text-sm">
                    {cart?.paymentMethod?.formatted ?? "Não informado"}
                  </p>
                </div>
                <Separator />
                <div>
                  <span className="font-bold text-xs">Total:</span>
                  <p className="font-bold text-primary text-sm">
                    {formatCurrency(
                      cart?.total! // + cart?.deliveryInfo.deliveryFee
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Informações Adicionais */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4" />
                  Informações Adicionais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                <div>
                  <span className="font-medium text-xs">Criado em:</span>
                  <p className="text-sm">
                    {formatDate(cart?.createdAt?.toISOString?.()!)}
                  </p>
                </div>
                {cart?.canceledAt && (
                  <div>
                    <span className="font-medium text-xs">Cancelado em:</span>
                    <p className="text-sm">
                      {formatDate(cart?.canceledAt?.toISOString?.())}
                    </p>
                  </div>
                )}
                {cart?.cancelReason && (
                  <div>
                    <span className="font-medium text-xs">
                      Motivo do cancelamento:
                    </span>
                    <p className="text-sm">{cart.cancelReason}</p>
                  </div>
                )}
                {cart?.finishedAt && (
                  <div>
                    <span className="font-medium text-xs">Finalizado em:</span>
                    <p className="text-sm">
                      {formatDate(cart?.finishedAt?.toISOString?.())}
                    </p>
                  </div>
                )}
                {cart?.expiredAt && (
                  <div>
                    <span className="font-medium text-xs">Expira em:</span>
                    <p className="text-sm">
                      {formatDate(cart?.expiredAt.toISOString())}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
