"use client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
} from "@/components/ui/sheet";
import {
  File,
  FolderClosed,
  ImagesIcon,
  PlusIcon,
  Send,
  X,
} from "lucide-react";
import Image from "next/image";
import { ChangeEvent, useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useServerActionMutation } from "@/hooks/server-action-hooks";
import { Spinner } from "flowbite-react";
import { sendAudio } from "@/app/actions/conversations";
import { useToast } from "@/hooks/use-toast";
import { Message } from "@/core/domain/entities/message";

type Props = {
  onAddMessage(message: Message.Props): void;
  conversationId?: string;
};

export const FileButton: React.FC<Props> = (props) => {
  const [openPreview, setOpenPreview] = useState<boolean>(false);
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string>("");
  const [fileType, setFileType] = useState<"image" | "file">("image");
  const { toast } = useToast();
  const uploadFileMessageAction = useServerActionMutation(sendAudio, {
    onError(error) {
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "error",
        duration: 3000,
      });
    },
    onSuccess(data) {
      props?.onAddMessage?.(Message.create(data));
      setOpenPreview(false);
    },
  });

  const accept =
    fileType === "image"
      ? "image/*"
      : "application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/csv";

  useEffect(() => {
    if (!openPreview) {
      onClear();
    }
  }, [openPreview]);

  const onClear = () => {
    setFile(null);
    setMessage("");
    setFileType("image");
  };

  const handlePrepareFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFile(file);
    setOpenPreview(true);
  };

  const handleUpload = () => {
    if (!file) return;
    uploadFileMessageAction.mutate({
      file,
      message,
      conversationId: props.conversationId ?? "",
    });
  };

  return (
    <>
      <Sheet open={openPreview} onOpenChange={setOpenPreview}>
        <SheetContent side="bottom" className="h-screen">
          <SheetHeader>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <X />
              </Button>
            </SheetClose>
          </SheetHeader>
          <div className="w-full h-full flex items-center justify-center pb-20">
            <div className="container flex gap-4 flex-col h-full justify-center items-center">
              <div className="w-full rounded-md bg-muted gap-6 flex-col flex justify-center items-center h-full">
                {fileType === "image" ? (
                  <Image
                    src={file ? URL.createObjectURL(file) : "/logo.png"}
                    alt=""
                    width={800}
                    height={800}
                  />
                ) : (
                  <>
                    <File />
                  </>
                )}
                <div className="flex flex-col items-center">
                  <span className="font-medium">{file?.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {((file?.size || 0) / 1024).toFixed(2)} Kb
                  </span>
                </div>
              </div>
              <div className="w-full flex items-center gap-4 max-w-[300px]">
                <Input
                  className="w-full rounded-full"
                  placeholder="Mensagem..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={uploadFileMessageAction.isPending}
                />
                <Button
                  onClick={handleUpload}
                  className="rounded-full disabled:opacity-50"
                  size="icon"
                  disabled={uploadFileMessageAction.isPending}
                >
                  <Spinner
                    data-hidden={!uploadFileMessageAction.isPending}
                    className="animate-spin -translate-y-0.5"
                  />
                  <Send
                    data-hidden={uploadFileMessageAction.isPending}
                    className="rotate-45 -translate-x-0.5"
                  />
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <input
        id="file"
        type="file"
        accept={accept}
        className="hidden"
        onChange={handlePrepareFile}
      />
      <DropdownMenu>
        <DropdownMenuTrigger className="group" asChild>
          <Button
            size="icon"
            variant="ghost"
            className="rounded-full shadow-none w-10 h-10 p-2"
            aria-label="Open edit menu"
          >
            <PlusIcon className="size-8 group-data-[state=open]:duration-300 duration-300 group-data-[state=open]:-rotate-45 stroke-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="pb-2">
          <Label
            onClick={() => {
              setFileType("file");
            }}
            htmlFor="file"
          >
            <DropdownMenuItem>
              <FolderClosed className="opacity-60 stroke-primary stroke-1 size-7" />
              <span className="text-sm">Arquivos</span>
            </DropdownMenuItem>
          </Label>
          <Label
            onClick={() => {
              setFileType("image");
            }}
            htmlFor="file"
          >
            <DropdownMenuItem>
              <ImagesIcon className="opacity-60 stroke-1 stroke-orange-500  size-7" />
              <span className="text-sm">Imagens</span>
            </DropdownMenuItem>
          </Label>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
