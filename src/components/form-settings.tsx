"use client";

import { updateSettings } from "@/app/actions/settings";
import { useServerActionMutation } from "@/hooks/server-action-hooks";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import { SettingProps } from "@/core/domain/value-objects/setting";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";

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
          attendantName: form.get("attendantName")?.toString() ?? "",
          businessName: form.get("businessName")?.toString() ?? "",
          locationAvailable: form.get("locationAvailable")?.toString() ?? "",
          paymentMethods: form.get("paymentMethods")?.toString() ?? "",
          vectorNamespace: form.get("vectorNamespace")?.toString() ?? "",
          knowledgeBase: form.get("knowledgeBase")?.toString() ?? "",
          aiEnabled: form.get("aiEnabled")?.toString() === "on",
        };
        mutate(body);
      }}
      className="flex flex-wrap shadow rounded bg-white p-6 gap-4"
    >
      <div className="flex flex-col w-full max-w-[300px] gap-1">
        <Label className="text-sm text-muted-foreground">
          Nome da atendente
        </Label>
        <Input
          defaultValue={props.setting?.attendantName}
          name="attendantName"
          className="w-full"
          placeholder=""
        />
      </div>

      <div className="flex flex-col w-full max-w-[300px] gap-1">
        <Label className="text-sm text-muted-foreground">
          Nome do estabelecimento
        </Label>
        <Input
          defaultValue={props.setting?.businessName}
          name="businessName"
          className="w-full"
          placeholder=""
        />
      </div>

      <div className="flex flex-col w-full max-w-[300px] gap-1">
        <Label className="text-sm text-muted-foreground">Waba ID</Label>
        <Input
          defaultValue={props.setting?.wabaId}
          maxLength={17}
          name="wabaId"
          className="w-full"
          placeholder=""
        />
      </div>

      <div className="flex flex-col w-full max-w-[300px] gap-1">
        <Label className="text-sm text-muted-foreground">
          Vector namespace
        </Label>
        <Input
          defaultValue={props.setting?.vectorNamespace}
          name="vectorNamespace"
          className="w-full"
          placeholder=""
        />
      </div>
      <div className="flex flex-col w-full max-w-[300px] gap-1">
        <Label className="text-sm text-muted-foreground">Habilitar IA?</Label>
        <Switch name="aiEnabled" defaultChecked={props.setting.aiEnabled} />
      </div>

      <div className="flex flex-col w-full gap-1">
        <Label className="text-sm text-muted-foreground">
          Localidades de entrega
        </Label>
        <Textarea
          defaultValue={props.setting?.locationAvailable}
          name="locationAvailable"
          className="w-full h-screen max-h-[100px]"
          placeholder=""
        />
      </div>
      <div className="flex flex-col w-full gap-1">
        <Label className="text-sm text-muted-foreground">
          Métodos de pagamentos
        </Label>
        <Textarea
          defaultValue={props.setting?.paymentMethods}
          name="paymentMethods"
          className="w-full h-screen max-h-[100px]"
          placeholder=""
        />
      </div>
      <div className="flex flex-col w-full gap-1">
        <Label className="text-sm text-muted-foreground">
          Base de conhecimento do estabelecimento
        </Label>
        <Textarea
          defaultValue={props.setting?.knowledgeBase}
          name="knowledgeBase"
          className="w-full h-screen max-h-[100px]"
          placeholder=""
        />
      </div>

      <footer className="w-full flex justify-end items-center">
        <Button className="bg-green-500">Salvar</Button>
      </footer>
    </form>
  );
}
