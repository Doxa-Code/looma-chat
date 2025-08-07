import { retrieveSettings } from "@/app/actions/settings";
import { FormSetting } from "@/components/form-settings";
import { TitlePage } from "@/components/title-page";

export default async function SettingPage() {
  const [setting] = await retrieveSettings();
  return (
    <main className="w-full flex flex-col h-full p-10 gap-10">
      <TitlePage>Configurações Gerais</TitlePage>
      <FormSetting setting={setting!} />
    </main>
  );
}
