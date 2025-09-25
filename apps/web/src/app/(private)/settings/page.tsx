import { listPhonesId, retrieveSettings } from "@/app/actions/settings";
import { FormSetting } from "@/components/form-settings";
import { TitlePage } from "@/components/title-page";

export default async function SettingPage() {
  const [setting] = await retrieveSettings({});
  const [phones] = await listPhonesId();
  return (
    <main className="w-full flex flex-col h-full p-10 gap-10">
      <TitlePage>Configurações Gerais</TitlePage>
      <FormSetting setting={setting!} phones={phones ?? []} />
    </main>
  );
}
