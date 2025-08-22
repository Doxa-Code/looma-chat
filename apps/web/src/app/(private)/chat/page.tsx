import { Chat } from "@/components/chat";
import { listAllConversations } from "../../actions/conversations";
import { getUserAuthenticate } from "@/app/actions/security";
import { retrieveSettings } from "@/app/actions/settings";

export const revalidate = 0;

export default async function Page() {
  const [conversations] = await listAllConversations();
  const [userAuthenticated] = await getUserAuthenticate();
  const [settings] = await retrieveSettings();

  return (
    <main className="w-full !overflow-y-hidden flex p-10 flex-1">
      <Chat
        conversations={conversations ?? []}
        userAuthenticated={userAuthenticated?.raw?.()!}
        channel={settings?.phoneId!}
      />
    </main>
  );
}
