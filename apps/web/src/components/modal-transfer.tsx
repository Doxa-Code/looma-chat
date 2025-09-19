"use client";
import { Forward, ChevronDownIcon } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { listSectors } from "@/app/actions/sectors";
import { listUsers, validateTransferPermission } from "@/app/actions/users";
import { transferConversation } from "@/app/actions/conversations";
import { useState, useMemo } from "react";
import {
  useServerActionQuery,
  useServerActionMutation,
} from "@/hooks/server-action-hooks";
import { SectorRaw } from "@looma/core/domain/value-objects/sector";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  conversationId?: string;
  userInfo: {
    id: string;
    sector: SectorRaw | null;
  };
}

export const ModalTransfer: React.FC<Props> = ({
  conversationId,
  userInfo,
}) => {
  const queryClient = useQueryClient();
  const [sector, setSector] = useState("");
  const [attendant, setAttendant] = useState("");
  const [open, setOpen] = useState(false);

  const { data: sectorsList } = useServerActionQuery(listSectors, {
    input: undefined,
    queryKey: ["sectors"],
  });

  const { data: attendantsList } = useServerActionQuery(listUsers, {
    input: undefined,
    queryKey: ["attendant"],
  });

  const { data: transferToUser } = useServerActionQuery(
    validateTransferPermission,
    {
      input: { userId: userInfo.id },
      queryKey: ["users"],
    }
  );

  const sectorSelected = useMemo(() => {
    return sectorsList?.find((s) => s.id === sector)?.name ?? "Selecione";
  }, [sectorsList, sector]);

  const attendantSelected = useMemo(() => {
    return attendantsList?.find((s) => s.id === attendant)?.name ?? "Selecione";
  }, [attendantsList, attendant]);

  const filteredAttendants = useMemo(() => {
    if (!sector) return [];

    if (transferToUser) {
      return attendantsList?.filter((a) => a?.sector?.id === sector) ?? [];
    }

    if (sector === userInfo.sector?.id) {
      return attendantsList?.filter((a) => a?.sector?.id === sector) ?? [];
    }

    return [];
  }, [attendantsList, sector]);

  const showAttendantsDropdown = useMemo(() => {
    if (!sector) return true;

    if (transferToUser) return false;

    return sector !== userInfo.sector?.id;
  }, [sector, transferToUser, userInfo]);

  const { mutate: transfer, isPending } = useServerActionMutation(
    transferConversation,
    {
      onSuccess: async () => {
        setOpen(false);
        toast({
          variant: "success",
          title: "Transferência realizada com sucesso!",
          duration: 3000
        });
        await queryClient.refetchQueries({
          queryKey: ["list-conversations"],
          exact: true
        });
      },
      onError: (err) => {
        toast({
          variant: "error",
          title: "Erro",
          description:
            (err as Error).message || "Erro ao remover produto do carrinho",
        });
      },
    }
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="data-[active=true]:bg-sky-500 group rounded-lg"
        >
          <Forward className="size-4 group-data-[active=true]:!stroke-sky-100" />
        </Button>
      </DialogTrigger>
      <DialogContent className="flex flex-col gap-0 p-0 [&>button:last-child]:top-3.5">
        <DialogHeader className="contents space-y-0 text-left">
          <DialogTitle className="border-b px-6 py-4 ">
            <legend className="text-foreground text-lg leading-none font-semibold">
              Transferência de atendimento
            </legend>
          </DialogTitle>
        </DialogHeader>
        <div className="px-6 py-4">
          <form
            className="space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              transfer({
                conversationId: conversationId || "",
                sectorId: sector,
                attendantId: attendant || undefined,
              });
            }}
          >
            <div className="space-y-4">
              <div>
                <fieldset className="space-y-4">
                  <legend className="text-foreground leading-none">
                    Selecione o setor
                  </legend>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild className="w-full">
                      <Button
                        variant="ghost"
                        className="w-full border border-gray-250 rounded justify-between"
                      >
                        {sectorSelected}
                        <ChevronDownIcon
                          className="-me-1 opacity-60"
                          size={16}
                          aria-hidden="true"
                        />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="min-w-(--radix-dropdown-menu-trigger-width)">
                      <DropdownMenuRadioGroup
                        value={sector ?? ""}
                        onValueChange={(value) => {
                          setSector(value);
                          setAttendant("");
                        }}
                      >
                        {sectorsList?.map((s) => (
                          <DropdownMenuRadioItem key={s.id} value={s.id}>
                            {s.name}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </fieldset>
              </div>
              <div data-hidden={showAttendantsDropdown}>
                <fieldset className="space-y-4">
                  <legend className="text-foreground leading-none">
                    Selecione o atendente
                  </legend>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild className="w-full">
                      <Button
                        variant="ghost"
                        className="w-full border border-gray-250 rounded justify-between"
                      >
                        {attendantSelected}
                        <ChevronDownIcon
                          className="-me-1 opacity-60"
                          size={16}
                          aria-hidden="true"
                        />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="min-w-(--radix-dropdown-menu-trigger-width)">
                      <DropdownMenuRadioGroup
                        value={attendant ?? ""}
                        onValueChange={setAttendant}
                      >
                        {filteredAttendants?.map((s) => (
                          <DropdownMenuRadioItem key={s.id} value={s.id}>
                            {s.name}
                          </DropdownMenuRadioItem>
                        ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </fieldset>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Transferindo..." : "Transferir"}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
