import { ContactRaw } from "@/core/domain/value-objects/contact";
import { User2 } from "lucide-react";
import { Avatar, AvatarFallback } from "../ui/avatar";

type Props = {
  contact?: ContactRaw;
};

export const ChatHeader: React.FC<Props> = ({ contact }) => {
  return (
    <div className="w-full z-50 items-center border-b flex absolute top-0 bg-white h-16 gap-4 py-6 px-4">
      <Avatar className="h-10 w-10 bg-white border">
        <AvatarFallback className="border">
          <User2 className="stroke-1 size-5" />
        </AvatarFallback>
      </Avatar>

      <div className="flex flex-col">
        <span className="font-semibold text-muted-foreground">
          {contact?.name}
        </span>
        <span className="font-normal text-xs text-muted-foreground">
          {contact?.phone}
        </span>
      </div>
    </div>
  );
};
