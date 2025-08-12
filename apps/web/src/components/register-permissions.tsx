import { RiCloseLine } from "@remixicon/react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { cx } from "@/lib/utils";
import {
  permissions,
  PolicyName,
} from "@looma/core/domain/services/authorization-service";
import { useEffect, useState } from "react";
import { Divider } from "./ui/divider";
import { useServerActionMutation } from "@/hooks/server-action-hooks";
import { upsertPermissions } from "@/app/actions/users";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

type Props = {
  disabled: boolean;
  userPermissions: PolicyName[];
  userId: string;
  onClear(): void;
};

export const RegisterPermissions: React.FC<Props> = (props) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const upsertPermissionsAction = useServerActionMutation(upsertPermissions, {
    onSuccess() {
      toast({
        variant: "success",
        title: "Permissões salvas com sucesso",
      });
      setOpen(false);
      setUserPermissions(new Set());
      props?.onClear?.();
      queryClient.invalidateQueries({
        queryKey: ["list-users"],
      });
    },
    onError(err) {
      toast({
        variant: "error",
        title: "Erro ao salvar permissões",
        description: err.message,
      });
    },
  });
  const [userPermissions, setUserPermissions] = useState<Set<PolicyName>>(
    new Set()
  );

  useEffect(() => {
    setUserPermissions(new Set(props.userPermissions));
  }, [props.userPermissions]);

  useEffect(() => {
    if (!open) {
      props?.onClear?.();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          disabled={props.disabled}
          className="px-2 py-1.5 border-purple-200 disabled:border-transparent bg-purple-100 text-purple-800 hover:bg-purple-200 disabled:bg-muted font-normal text-xs disabled:text-muted-foreground disabled:cursor-not-allowed"
          variant="secondary"
        >
          Permissões
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
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
            upsertPermissionsAction.mutate({
              userId: props.userId,
              permissions: Array.from(userPermissions),
            });
          }}
          method="POST"
        >
          <DialogHeader>
            <DialogTitle>Permissões</DialogTitle>
            <DialogDescription className="mt-1 text-sm/6">
              As permissões de usuário definem o que cada membro pode
              visualizar, editar ou gerenciar dentro dos Workspaces.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 flex items-center justify-end gap-2">
            <Label>Todas as permissões</Label>
            <Switch
              checked={userPermissions.size === Object.keys(permissions).length}
              onCheckedChange={(checked) =>
                setUserPermissions(
                  new Set<PolicyName>(
                    checked ? (Object.keys(permissions) as PolicyName[]) : []
                  )
                )
              }
            />
          </div>

          <div className="grid grid-cols-3 gap-2 mt-6">
            {(Object.keys(permissions) as PolicyName[]).map((permission) => (
              <div
                key={permission}
                className={cx(
                  "flex items-center border rounded gap-2 px-3 py-6 bg-muted"
                )}
              >
                <Switch
                  id={permission}
                  aria-describedby="enable-description"
                  className="mt-1"
                  checked={userPermissions.has(permission)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      userPermissions.add(permission);
                    } else {
                      userPermissions.delete(permission);
                    }
                    setUserPermissions(new Set(userPermissions.values()));
                  }}
                />
                <div className="flex flex-col gap-2">
                  <Label htmlFor={permission} className="font-medium">
                    {permission}
                  </Label>
                  <p
                    id="enable-description"
                    className="text-xs text-gray-500 dark:text-gray-500"
                  >
                    {(permissions as any)[permission] ?? ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <Divider />
          <footer className="flex justify-end items-center gap-2">
            <Button>Salvar</Button>
            <Button variant="light">Cancelar</Button>
          </footer>
        </form>
      </DialogContent>
    </Dialog>
  );
};
