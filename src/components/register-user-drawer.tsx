"use client";

import { listSectors } from "@/app/actions/sectors";
import { upsertUser } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  useServerActionMutation,
  useServerActionQuery,
} from "@/hooks/server-action-hooks";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import Immutable from "seamless-immutable";
import { UserPayload } from "./table-users";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import MultiSelect from "./multi-select";
import RegisterSector from "./register-sector";
import { Field } from "./field";

type Props = {
  open: boolean;
  setOpen(open: boolean): void;
  user: UserPayload | null;
};

export function RegisterUserDrawer(props: Props) {
  const [openRegisterSetor, setOpenRegisterSetor] = useState(false);
  const { data: sectors } = useServerActionQuery(listSectors, {
    input: undefined,
    queryKey: ["list-sectors"],
  });
  const [user, setUser] = useState<UserPayload>(
    props.user ?? {
      name: "",
      email: "",
      type: "user",
    }
  );
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const immutableUser = Immutable(user);
  const upsertUserAction = useServerActionMutation(upsertUser, {
    async onSuccess() {
      await queryClient.invalidateQueries({
        exact: true,
        queryKey: ["list-users"],
      });
      props.setOpen(false);
      toast({
        title: "Usuário criado com sucesso",
        variant: "success",
      });
    },
    onError(error) {
      toast({
        title: "Erro ao registrar usuario",
        description: error.message,
        variant: "error",
      });
    },
  });

  useEffect(() => {
    if (props.user) {
      setUser(props.user);
    }
  }, [props]);

  return (
    <>
      <Drawer open={props.open} onOpenChange={props.setOpen}>
        <DrawerTrigger asChild>
          <Button
            onClick={() =>
              setUser({
                name: "",
                email: "",
                type: "user",
              })
            }
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            Novo usuário
          </Button>
        </DrawerTrigger>
        <DrawerContent className="!px-0">
          <div className="mx-auto w-full">
            <DrawerHeader className="px-6">
              <DrawerTitle>Cadastro de usuário</DrawerTitle>
              <DrawerDescription>
                Preencha as informações para continuar
              </DrawerDescription>
            </DrawerHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                upsertUserAction.mutate(user);
              }}
              className="px-4 mt-4 flex flex-col gap-4"
            >
              <Field>
                <Label>Nome</Label>
                <Input
                  type="text"
                  value={user?.name}
                  onChange={(e) => {
                    setUser(
                      immutableUser
                        .set("name", e.target.value)
                        .asMutable({ deep: true })
                    );
                  }}
                />
              </Field>
              <Field>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={user?.email}
                  onChange={(e) => {
                    setUser(
                      immutableUser
                        .set("email", e.target.value)
                        .asMutable({ deep: true })
                    );
                  }}
                />
              </Field>
              <Field>
                <Label>Tipo</Label>
                <Select
                  onValueChange={(value) => {
                    setUser(
                      immutableUser.set("type", value).asMutable({ deep: true })
                    );
                  }}
                  value={user.type}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuário</SelectItem>
                    <SelectItem value="superuser">Super usuário</SelectItem>
                    <SelectItem value="system">Sistema</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <Label>Setor</Label>
                <MultiSelect
                  onSelected={(sectorId) => {
                    setUser(
                      immutableUser
                        .set("sectorId", sectorId)
                        .asMutable({ deep: true })
                    );
                  }}
                  options={
                    sectors?.map((s) => ({ label: s.name, value: s.id })) ?? []
                  }
                  selected={user.sectorId ?? ""}
                  onAdd={() => {
                    setOpenRegisterSetor(true);
                  }}
                />
              </Field>
              <DrawerFooter className="mt-6">
                <Button className="w-full sm:w-fit">Salvar</Button>
                <DrawerClose asChild>
                  <Button
                    className="mt-2 w-full sm:mt-0 sm:w-fit"
                    variant="secondary"
                    type="button"
                  >
                    Cancelar
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </form>
          </div>
        </DrawerContent>
      </Drawer>
      <RegisterSector open={openRegisterSetor} setOpen={setOpenRegisterSetor} />
    </>
  );
}
