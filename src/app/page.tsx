import { getUserAuthenticate } from "@/app/actions/security";
import { redirect, RedirectType } from "next/navigation";

export default async function Page() {
  const [user] = await getUserAuthenticate();

  if (!user) redirect("/signin", RedirectType.replace);

  redirect("/chat", RedirectType.replace);
}
