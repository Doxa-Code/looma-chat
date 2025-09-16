import { Forward } from "lucide-react";
import { Button } from "./ui/button";

export const ModalTransfer = () => {
  return (
    <Button
      variant="ghost"
      className="data-[active=true]:bg-sky-500 group rounded-lg"
    >
      <Forward className="size-4 group-data-[active=true]:!stroke-sky-100" />
    </Button>
  );
};
