"use client";
import { Copy } from "lucide-react";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";

type Props = {
  workspaceId: string;
};

export const ButtonCopyIdWorkspace = (props: Props) => {
  const { toast } = useToast();
  const copyIdToClipboard = () => {
    navigator.clipboard
      .writeText(props.workspaceId)
      .then(() => {
        toast({
          variant: "success",
          title: "Copiada para área de transferência",
        });
      })
      .catch((err) => console.error("Erro ao copiar:", err));
  };
  return (
    <Button
      title="Copiar id para área de transferência"
      onClick={copyIdToClipboard}
      variant="secondary"
      className="p-2"
    >
      <Copy className="size-4" />
    </Button>
  );
};
