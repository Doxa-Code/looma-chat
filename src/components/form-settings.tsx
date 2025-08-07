"use client";

import { updateSettings } from "@/app/actions/settings";
import { useServerActionMutation } from "@/hooks/server-action-hooks";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import { SettingProps } from "@/core/domain/value-objects/setting";

type Props = {
  setting: SettingProps;
};

export function FormSetting(props: Props) {
  const { toast } = useToast();
  const { mutate } = useServerActionMutation(updateSettings, {
    onError(error) {
      toast({
        title: "Erro ao salvar configurações",
        description: error.message,
        variant: "error",
        duration: 3000,
      });
    },
    onSuccess() {
      toast({
        title: "Salvo com sucesso!",
        variant: "success",
        duration: 3000,
      });
    },
  });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const body = {
          wabaId: form.get("wabaId")?.toString() ?? "",
        };
        mutate(body);
      }}
      className="flex flex-col flex-1 shadow rounded bg-white p-6 gap-4"
    >
      <div className="border px-5 py-8 relative rounded">
        <span className="absolute -top-3 text-primary font-semibold bg-white">
          Dados da conta do Whatsapp
        </span>

        <div className="flex flex-col max-w-[300px] gap-1">
          <Label className="text-sm text-muted-foreground">Waba ID</Label>
          <Input
            defaultValue={props.setting?.wabaId}
            maxLength={17}
            name="wabaId"
            className="w-full"
            placeholder="01234567890123456"
          />
        </div>
      </div>
      <footer className="w-full flex justify-end items-center">
        <Button className="bg-green-500">Salvar</Button>
      </footer>
    </form>
  );
}
