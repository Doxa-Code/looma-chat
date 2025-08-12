import { listAllProducts } from "@/app/actions/products";
import { ContainerPage } from "@/components/container-page";
import TableProducts from "@/components/table-products";
import { TitlePage } from "@/components/title-page";

export default async function Products() {
  const [result] = await listAllProducts({
    page: 0,
    size: 20,
  });

  return (
    <ContainerPage>
      <TitlePage>Produtos</TitlePage>
      <div className="p-4 bg-white shadow rounded h-full">
        <TableProducts
          products={result?.products ?? []}
          total={result?.total ?? 0}
        />
      </div>
    </ContainerPage>
  );
}
