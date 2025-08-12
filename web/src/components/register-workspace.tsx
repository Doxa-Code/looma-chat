"use client";

import { RiCloseLine } from "@remixicon/react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import Immutable from "seamless-immutable";
import { useServerActionMutation } from "@/hooks/server-action-hooks";
import { upsertWorkspace } from "@/app/actions/users";
import { useToast } from "@/hooks/use-toast";

type WorkspacePayload = {
  id: string;
  name: string;
};

export function RegisterWorkspace() {
  const [workspace, setWorkspace] = useState<WorkspacePayload>({
    id: "",
    name: "",
  });
  const immutableWorkspace = Immutable(workspace);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const upsertWorkspaceAction = useServerActionMutation(upsertWorkspace, {
    onSuccess() {
      toast({
        variant: "success",
        title: "Área de trabalho cadastrada com sucesso",
      });
      setOpen(false);
    },
    onError(error) {
      toast({
        variant: "error",
        title: "Erro ao cadastrar Área de trabalho",
        description: error.message,
      });
    },
  });

  useEffect(() => {
    if (!open) {
      setWorkspace({ id: "", name: "" });
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="primary">Nova área de trabalho</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogClose asChild>
          <Button
            className="absolute right-3 top-3 p-2 !text-gray-400 hover:text-gray-500 dark:!text-gray-600 hover:dark:text-gray-500"
            variant="ghost"
          >
            <RiCloseLine className="size-5 shrink-0" />
          </Button>
        </DialogClose>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            upsertWorkspaceAction.mutate(workspace);
          }}
          method="POST"
        >
          <DialogHeader>
            <DialogTitle>Cadastro de área de trabalho</DialogTitle>
            <DialogDescription className="mt-1 text-sm/6">
              Área de trabalho são ambientes compartilhados onde as equipes
              podem se conectar a fontes de dados, executar consultas e criar
              recursos.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6">
            <Label htmlFor="workspace-name" className="required">
              Nome
            </Label>
            <Input
              type="text"
              id="workspace-name"
              name="workspace-name"
              placeholder="Minha equipe"
              className="mt-2"
              required
              value={workspace.name}
              onChange={(e) => {
                setWorkspace(
                  immutableWorkspace
                    .set("name", e.target.value ?? "")
                    .asMutable({ deep: true })
                );
              }}
            />
            <Button type="submit" className="mt-4 w-full">
              Criar área de trabalho
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
