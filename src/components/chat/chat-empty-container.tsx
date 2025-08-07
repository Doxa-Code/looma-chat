import Image from "next/image";
import React from "react";

type Props = {
  hidden: boolean;
};

export const ChatEmptyContainer: React.FC<Props> = ({ hidden }) => (
  <div
    className="w-full flex-1 flex flex-col justify-center items-center"
    data-hidden={hidden}
  >
    <Image
      className="grayscale w-50 opacity-40"
      src="/icon.png"
      width={1000}
      height={1000}
      alt="icon"
    />
    <span className="font-light text-muted-foreground">
      Selecione uma conversa pra continuar
    </span>
  </div>
);
