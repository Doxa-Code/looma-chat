"use client";
import { listUsers, removeUser } from "@/app/actions/users";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRoot,
  TableRow,
} from "@/components/ui/table";
import { User as UserEntity } from "@/core/domain/entities/user";
import { PolicyName } from "@/core/domain/services/authorization-service";
import { SectorRaw } from "@/core/domain/value-objects/sector";
import {
  useServerActionMutation,
  useServerActionQuery,
} from "@/hooks/server-action-hooks";
import { useToast } from "@/hooks/use-toast";
import { cx } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import {
  ColumnDef,
  FilterFn,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import { HTMLAttributes, useEffect, useMemo, useRef, useState } from "react";
import { ModalDelete } from "./modal-delete";
import { RegisterPermissions } from "./register-permissions";
import { RegisterUserDrawer } from "./register-user-drawer";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

type User = {
  id: string;
  name: string;
  email: string;
  sector: {
    id: string;
    name: string;
  };
  type: UserEntity.Type;
  permissions: PolicyName[];
};

type Props = {
  users: User[];
};

export type UserPayload = {
  id?: string;
  email: string;
  name: string;
  type: UserEntity.Type;
  sectorId?: string;
};

export default function TableUsers(props: Props) {
  const [rowSelection, setRowSelection] = useState({});
  const { data: users } = useServerActionQuery<any, any>(listUsers, {
    input: undefined,
    queryKey: ["list-users"],
    initialData: props.users,
  });
  const [openModal, setOpenModal] = useState<"edit" | "remove" | null>();
  const [userToEdit, setUserToEdit] = useState<UserPayload | null>(null);
  const [usersToRemove, setUsersToRemove] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const removeUserAction = useServerActionMutation(removeUser, {
    async onSuccess() {
      toast({
        title: "Usuário(s) removido(s) com sucesso",
        variant: "success",
      });
      await queryClient.invalidateQueries({
        queryKey: ["list-users"],
      });
    },
    onError(error) {
      toast({
        title: "Erro ao remover usuário(s)",
        description: error.message,
        variant: "error",
      });
    },
  });

  useEffect(() => {
    if (!openModal) {
      setUserToEdit(null);
    }
  }, [openModal]);

  const multiColumnFilterFn: FilterFn<User> = (row, _, filterValue) => {
    const searchableRowContent =
      `${row.original.name} ${row.original.email}`.toLowerCase();
    const searchTerm = (filterValue ?? "").toLowerCase();
    return searchableRowContent.includes(searchTerm);
  };

  const columns = useMemo(
    () =>
      [
        {
          id: "select",
          header: ({ table }) => (
            <IndeterminateCheckbox
              {...{
                checked: table.getIsAllRowsSelected(),
                indeterminate: table.getIsSomeRowsSelected(),
                onChange: table.getToggleAllRowsSelectedHandler(),
              }}
              className="-translate-y-[1px]"
            />
          ),
          cell: ({ row }) => (
            <IndeterminateCheckbox
              {...{
                checked: row.getIsSelected(),
                disabled: !row.getCanSelect(),
                indeterminate: row.getIsSomeSelected(),
                onChange: row.getToggleSelectedHandler(),
              }}
              className="-translate-y-[1px]"
            />
          ),
          enableSorting: false,
          meta: {
            align: "text-left",
          },
        },
        {
          header: "Nome",
          accessorKey: "name",
          filterFn: multiColumnFilterFn,
          enableColumnFilter: true,
          cell({ cell, row }) {
            return (
              <div className="flex items-center justify-start gap-4 pt-2 pb-1">
                <span
                  className={cx(
                    "bg-primary",
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-xs text-white dark:text-white"
                  )}
                  aria-hidden="true"
                >
                  {cell
                    .getValue<string>()
                    .split(" ")
                    .map((word) => word[0])
                    .join("")}
                </span>
                <div className="flex flex-col items-start justify-center gap-1">
                  <Label>{cell.getValue<string>()}</Label>
                  <Label className="text-xs text-gray-500">
                    {row.original.email}
                  </Label>
                </div>
              </div>
            );
          },
          meta: {
            align: "text-left",
          },
        },
        {
          header: "Setor",
          accessorKey: "sector",
          cell: ({ cell }) => {
            return <span>{cell.getValue<SectorRaw>()?.name ?? "-"}</span>;
          },
          meta: {
            align: "text-left",
          },
        },
        {
          header: "Tipo de usuário",
          accessorKey: "type",
          enableSorting: false,
          cell: ({ cell }) => {
            if (cell.getValue<UserEntity.Type>() === "user") {
              return <Badge>Usuário</Badge>;
            }
            if (cell.getValue<UserEntity.Type>() === "superuser") {
              return <Badge variant="outline">Super usuário</Badge>;
            }
            if (cell.getValue<UserEntity.Type>() === "system") {
              return <Badge variant="outline">Sistema</Badge>;
            }
          },
          meta: {
            align: "text-left",
          },
        },
      ] satisfies ColumnDef<User>[],
    []
  );

  const table = useReactTable({
    data: users ?? [],
    columns,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      rowSelection,
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <header className="w-full flex items-center justify-between">
        <Input
          value={(table.getColumn("name")?.getFilterValue() ?? "") as string}
          onChange={(e) =>
            table.getColumn("name")?.setFilterValue(e.target.value)
          }
          type="search"
          className="max-w-sm"
          placeholder="Pesquisar..."
        />
        <RegisterUserDrawer
          open={openModal === "edit"}
          setOpen={(open) => setOpenModal(open ? "edit" : null)}
          user={userToEdit}
        />
      </header>
      <div className="relative p-0 border rounded border-b-0 mb-20">
        <TableRoot>
          <Table>
            <TableHead>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header: any) => (
                    <TableHeaderCell
                      key={header.id}
                      className={cx(
                        header.column.columnDef.meta?.align,
                        "py-1.5 font-medium text-sm"
                      )}
                    >
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    </TableHeaderCell>
                  ))}
                </TableRow>
              ))}
            </TableHead>
            <TableBody>
              {table.getRowModel().rows.length <= 0 && (
                <TableRow>
                  <TableCell
                    colSpan={table.getAllColumns().length}
                    className="py-6 text-center"
                  >
                    Nenhum usuário encontrado
                  </TableCell>
                </TableRow>
              )}
              {table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => row.toggleSelected(!row.getIsSelected())}
                  className="select-none hover:bg-gray-50 hover:dark:bg-gray-900"
                >
                  {row.getVisibleCells().map((cell: any, index) => (
                    <TableCell
                      key={cell.id}
                      className={cx(
                        row.getIsSelected()
                          ? "bg-gray-50 dark:bg-gray-900"
                          : "",
                        cell.column.columnDef.meta?.align,
                        "relative py-2"
                      )}
                    >
                      {index === 0 && row.getIsSelected() && (
                        <div className="absolute inset-y-0 left-0 w-0.5 bg-blue-500 dark:bg-blue-500" />
                      )}
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableRoot>
        <div
          className={cx(
            "absolute inset-x-0 -bottom-14 mx-auto flex w-fit items-center space-x-10 rounded-lg border border-gray-200 bg-white p-2 shadow-md dark:border-gray-800 dark:bg-gray-950",
            Object.keys(rowSelection).length > 0 ? "" : "hidden"
          )}
        >
          <div className="select-none text-sm flex items-center">
            <div className="rounded-full flex justify-center items-center gap-2 px-3 py-1.5 bg-blue-100 tabular-nums  dark:bg-blue-900 text-xs dark:text-blue-600">
              <span className="font-medium text-blue-600">
                {Object.keys(rowSelection).length}
              </span>
              <span className="font-normal text-blue-600 dark:text-gray-50">
                {Object.keys(rowSelection).length === 1
                  ? "selecionado"
                  : "selecionados"}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              disabled={Object.keys(rowSelection).length > 1}
              onClick={() => {
                const row = table.getRow(Object.keys(rowSelection)[0]);
                setOpenModal("edit");
                setUserToEdit({
                  email: row.original.email,
                  name: row.original.name,
                  id: row.original.id,
                  type: row.original?.type,
                  sectorId: row.original.sector?.id,
                });
                setRowSelection({});
              }}
              className="px-2 py-1.5 disabled:bg-muted font-normal text-xs disabled:text-muted-foreground disabled:cursor-not-allowed"
            >
              Editar
            </Button>

            <RegisterPermissions
              onClear={() => {
                setRowSelection({});
              }}
              disabled={Object.keys(rowSelection).length > 1}
              userPermissions={
                Object.keys(rowSelection)[0]
                  ? table?.getRow(Object.keys(rowSelection)[0])?.original
                      ?.permissions
                  : []
              }
              userId={
                Object.keys(rowSelection)[0]
                  ? table?.getRow(Object.keys(rowSelection)[0])?.original?.id
                  : ""
              }
            />

            <Button
              onClick={() => {
                setRowSelection({});
              }}
              className="px-2 py-1.5 text-xs border-amber-100 hover:bg-amber-200 text-amber-700 bg-amber-100 font-normal"
              variant="ghost"
            >
              Limpar
            </Button>
            <Button
              variant="light"
              className="px-2 py-1.5 bg-rose-100 hover:bg-rose-100 hover:opacity-75"
              onClick={() => {
                const rows = Object.keys(rowSelection).map(
                  (index) => table.getRow(index)?.original?.id
                );

                setOpenModal("remove");
                setUsersToRemove(rows ?? []);
              }}
            >
              <Trash2 className="size-4 stroke-rose-600" />
            </Button>
          </div>
        </div>
      </div>

      <ModalDelete
        open={openModal === "remove"}
        setOpen={(open) => setOpenModal(open ? "remove" : null)}
        onConfirm={() => {
          if (!usersToRemove.length) return;
          removeUserAction.mutate({
            ids: usersToRemove,
          });
          setUsersToRemove([]);
          setOpenModal(null);
          setRowSelection({});
        }}
      />
    </div>
  );
}

function IndeterminateCheckbox({
  indeterminate,
  className,
  ...rest
}: HTMLAttributes<HTMLInputElement> & {
  checked: boolean;
  indeterminate: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof indeterminate === "boolean" && ref.current?.indeterminate) {
      ref.current.indeterminate = !rest.checked && indeterminate;
    }
  }, [ref, indeterminate]);

  return (
    <input
      type="checkbox"
      ref={ref}
      className={cx(
        "size-4 rounded border-tremor-border text-tremor-brand shadow-tremor-input focus:ring-tremor-brand-muted dark:border-dark-tremor-border dark:bg-dark-tremor-background dark:text-dark-tremor-brand dark:shadow-dark-tremor-input dark:focus:ring-dark-tremor-brand-muted",
        className
      )}
      {...rest}
    />
  );
}
