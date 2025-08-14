import { listCarts } from "@/app/actions/cart";
import { CartList } from "@/components/cart-list";
import { TitlePage } from "@/components/title-page";

export default async function OrdersPage() {
  const [data] = await listCarts({});
  const carts = data ?? [];
  return (
    <>
      <header className="pt-6 px-6">
        <TitlePage>Pedidos</TitlePage>
      </header>
      <main className="p-6">
        <CartList cartsRaw={carts.map((c) => c.raw())} />
      </main>
    </>
  );
}
