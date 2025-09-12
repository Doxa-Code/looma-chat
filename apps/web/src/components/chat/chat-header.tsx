"use client";
import { useCart } from "@/hooks/use-cart";
import { ContactRaw } from "@looma/core/domain/value-objects/contact";
import { ShoppingCart, User2 } from "lucide-react";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Button } from "../ui/button";

type Props = {
  contact?: ContactRaw;
};

export const ChatHeader: React.FC<Props> = ({ contact }) => {
  const { openCart, setOpenCart } = useCart();
  return (
    <div className="w-full z-50 justify-between items-center border-b flex top-0 bg-white h-screen max-h-[64px] py-6 px-4">
      <div className="flex items-center gap-4">
        <Avatar className="h-10 w-10 bg-white border">
          <AvatarFallback className="border">
            <User2 className="stroke-1 size-5" />
          </AvatarFallback>
        </Avatar>

        <div className="flex flex-col">
          <span className="font-semibold text-[#171616]">{contact?.name}</span>
          <span className="font-normal text-xs text-muted-foreground">
            {contact?.phone}
          </span>
        </div>
      </div>
      <Button
        data-active={openCart}
        onClick={() => setOpenCart(!openCart)}
        variant="ghost"
        className="data-[active=true]:bg-sky-500 group rounded-lg"
      >
        <ShoppingCart className="size-4 group-data-[active=true]:!stroke-sky-100" />
      </Button>
    </div>
  );
};
