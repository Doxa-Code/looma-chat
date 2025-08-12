"use client";

import { PaginationState } from "@tanstack/react-table";
import {
  ChevronFirstIcon,
  ChevronLastIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { listAllProducts } from "@/app/actions/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/table";
import { Product } from "@looma/core/domain/value-objects/product";
import { useServerActionMutation } from "@/hooks/server-action-hooks";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "flowbite-react";
import { useDebouncedCallback } from "use-debounce";

type Props = {
  products: Product.Props[];
  total: number;
};

export default function TableProducts(props: Props) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const { data, mutate, isPending } = useServerActionMutation(listAllProducts, {
    onError(error) {
      toast({
        variant: "error",
        title: "Erro ao listar o estoque",
        description: error.message,
      });
    },
  });
  const debounceSearch = useDebouncedCallback((props) => {
    mutate(props);
    setPagination({
      pageIndex: 0,
      pageSize: 20,
    });
  }, 300);
  const products = useMemo(
    () => data?.products ?? props.products,
    [data?.products]
  );
  const total = useMemo(() => data?.total ?? props.total, [data?.total]);

  useEffect(() => {
    debounceSearch({
      page: 0,
      size: 20,
      searchTerm,
    });
  }, [searchTerm]);

  useEffect(() => {
    mutate({
      page: pagination.pageIndex,
      size: pagination.pageSize,
      searchTerm,
    });
  }, [pagination]);

  return (
    <div className="space-y-4 relative h-full flex flex-col">
      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Pesquisar por nome */}
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Pesquisar por nome..."
          type="search"
          aria-label="Pesquisar por nome"
          className="max-w-sm"
        />
        <div className="flex items-center gap-4">
          <span className="text-foreground text-xs text-nowrap">
            Página {isPending ? "..." : pagination.pageIndex + 1} de{" "}
            {isPending ? "..." : total} páginas
          </span>
          <Pagination>
            <PaginationContent>
              {/* First page button */}
              <PaginationItem>
                <Button
                  className="disabled:pointer-events-none disabled:opacity-50"
                  disabled={pagination.pageIndex === 0}
                  onClick={() => {
                    if (pagination.pageIndex === 0) return;
                    setPagination({
                      ...pagination,
                      pageIndex: 0,
                    });
                  }}
                  aria-label="Go to first page"
                >
                  <ChevronFirstIcon size={16} aria-hidden="true" />
                </Button>
              </PaginationItem>
              {/* Previous page button */}
              <PaginationItem>
                <Button
                  className="disabled:pointer-events-none disabled:opacity-50"
                  disabled={pagination.pageIndex === 0}
                  onClick={() => {
                    if (pagination.pageIndex === 0) return;
                    setPagination({
                      ...pagination,
                      pageIndex: pagination.pageIndex - 1,
                    });
                  }}
                  aria-label="Go to previous page"
                >
                  <ChevronLeftIcon size={16} aria-hidden="true" />
                </Button>
              </PaginationItem>
              {/* Next page button */}
              <PaginationItem>
                <Button
                  className="disabled:pointer-events-none disabled:opacity-50"
                  disabled={pagination.pageIndex === total - 1}
                  onClick={() => {
                    if (pagination.pageIndex === total - 1) return;

                    setPagination({
                      ...pagination,
                      pageIndex: pagination.pageIndex + 1,
                    });
                  }}
                  aria-label="Go to next page"
                >
                  <ChevronRightIcon size={16} aria-hidden="true" />
                </Button>
              </PaginationItem>
              {/* Last page button */}
              <PaginationItem>
                <Button
                  className="disabled:pointer-events-none disabled:opacity-50"
                  disabled={pagination.pageIndex === total - 1}
                  onClick={() => {
                    if (pagination.pageIndex === total - 1) return;
                    setPagination({
                      ...pagination,
                      pageIndex: total - 1,
                    });
                  }}
                  aria-label="Go to last page"
                >
                  <ChevronLastIcon size={16} aria-hidden="true" />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>

      <div
        data-hidden={!isPending}
        className="absolute z-[9999] h-full w-full bg-white/30 flex justify-center flex-col gap-4 items-center"
      >
        <Spinner />
        <span>Carregando produtos...</span>
      </div>

      {/* Table */}
      <div className="bg-background flex-1 overflow-hidden rounded-md border">
        <Table>
          <TableHead>
            <TableRow
              data-disabled={isPending}
              className="hover:bg-transparent data-[disabled=true]:opacity-40"
            >
              <TableHeaderCell>Código</TableHeaderCell>
              <TableHeaderCell>Descrição</TableHeaderCell>
              <TableHeaderCell>Fabricante</TableHeaderCell>
              <TableHeaderCell>Estoque</TableHeaderCell>
              <TableHeaderCell>Preço R$</TableHeaderCell>
              <TableHeaderCell>Preço Promocional R$</TableHeaderCell>
              <TableHeaderCell>Inicio Promoção</TableHeaderCell>
              <TableHeaderCell>Fim Promoção</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products?.length
              ? products?.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="py-2">
                      {product.code ?? "-"}
                    </TableCell>
                    <TableCell className="py-2">
                      {product.description}
                    </TableCell>
                    <TableCell className="py-2">
                      {product.manufactory}
                    </TableCell>
                    <TableCell
                      data-danger={product.stock <= 1}
                      className="data-[danger=true]:text-rose-500 py-2"
                    >
                      {product.stock}
                    </TableCell>
                    <TableCell className="py-2">
                      {product.price.toLocaleString("pt-br", {
                        currency: "BRL",
                        style: "currency",
                      })}
                    </TableCell>
                    <TableCell className="py-2">
                      {product.promotionStart
                        ? product.promotionPrice?.toLocaleString("pt-br", {
                            currency: "BRL",
                            style: "currency",
                          })
                        : "-"}
                    </TableCell>
                    <TableCell className="py-2">
                      {product.promotionStart?.toLocaleDateString("pt-br") ??
                        "-"}
                    </TableCell>
                    <TableCell className="py-2">
                      {product.promotionEnd?.toLocaleDateString("pt-br") ?? "-"}
                    </TableCell>
                  </TableRow>
                ))
              : null}

            <TableRow data-hidden={!!products?.length}>
              <TableCell colSpan={8} className="h-24 z-50 text-center">
                Nenhum produto registrado
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
