"use client";

import { LogOut, QrCode, User2 } from "lucide-react";

import { syncWaba } from "@/app/actions/settings";
import { signOut } from "@/app/actions/users";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/components/ui/sidebar";
import { useServerActionMutation } from "@/hooks/server-action-hooks";
import { useToast } from "@/hooks/use-toast";
import { User } from "@looma/core/domain/entities/user";
import { useEffect } from "react";
import { useServerAction } from "zsa-react";

export function NavUser({ user }: { user?: User.Raw }) {
  const { isMobile } = useSidebar();
  const signOutAction = useServerAction(signOut);
  const syncWabaAction = useServerActionMutation(syncWaba);
  const { toast } = useToast();

  useEffect(() => {
    window.fbAsyncInit = function () {
      FB.init({
        appId: "579228267872440",
        autoLogAppEvents: true,
        xfbml: true,
        version: "v23.0",
      });
    };

    (function (d, s, id) {
      var js,
        fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s) as HTMLScriptElement;
      js.id = id;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      fjs.parentNode?.insertBefore(js, fjs);
    })(document, "script", "facebook-jssdk");

    window.addEventListener("message", (event) => {
      if (
        event.origin !== "https://www.facebook.com" &&
        event.origin !== "https://web.facebook.com"
      ) {
        return;
      }
      try {
        const data = JSON.parse(event.data);
        if (data.type === "WA_EMBEDDED_SIGNUP") {
          if (data.event === "CANCEL") {
            toast({
              title: "Falha ao vincular conta",
              variant: "error",
              duration: 3000,
            });
          } else if (data.event === "ERROR") {
            const { error_message } = data.data;
            toast({
              title: "Falha ao vincular conta",
              description: error_message,
              variant: "error",
              duration: 3000,
            });
          }
        }
      } catch {
        const params = new URLSearchParams(event.data);

        syncWabaAction.mutate({
          code: params.get("code") ?? "",
        });
      }
    });

    return () => {
      window.removeEventListener("message", () => {});
    };
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="data-[state=open]:bg-muted overflow-hidden rounded-none data-[state=open]:text-sidebar-accent-foreground items-center justify-center cursor-pointer hover:opacity-80 md:h-[40px] gap-2 outline-0 ring-0 data-[state=collapsed]:px-0 flex pr-4">
        <Avatar className="h-8 w-8 bg-primary/80">
          <AvatarFallback className="rounded-lg bg-transparent">
            <User2 className="stroke-1 stroke-white" />
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
        side={isMobile ? "bottom" : "right"}
        align="end"
        sideOffset={4}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar className="h-8 w-8 rounded-lg border">
              <AvatarFallback className="rounded-lg">
                <User2 className="stroke-1 stroke-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left">
              <span className="truncate text-sm font-medium">{user?.name}</span>
              <span className="truncate text-xs font-light">{user?.email}</span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => {
            FB.login(() => {}, {
              config_id: "1315527863561114",
              response_type: "code",
              override_default_response_type: true,
              extras: {
                version: "v3",
                featureType: "whatsapp_business_app_onboarding",
                features: [
                  { name: "app_only_install" },
                  { name: "marketing_messages_lite" },
                ],
              },
            });
          }}
        >
          <QrCode />
          <span>Vincular meu número</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOutAction.execute()}>
          <LogOut />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
