import { Membership } from "../entities/membership";
import { User } from "../entities/user";

export interface Policy<TResource = any, TName extends string = string> {
  name: TName;
  description: string;
  can(user: User, resource: TResource, context?: any): boolean;
}

export const permissions = {
  "start:session": "Permite acessar o sistema",
  "manage:settings": "Permite o gerenciamento das configurações",
  "view:settings": "Permite ver as configurações",
  "update:settings": "Permite alterar as configurações",
  "manage:users": "Permite o gerenciamento dos usuários",
  "view:users": "Permite listar os usuarios",
  "upsert:users": "Permite criar/alterar usuários",
  "remove:users": "Permite remover usuários",
  "manage:sectors": "Permite o gerenciamento dos setores",
  "view:sectors": "Permite listar todos os setores",
  "upsert:sectors": "Permite criar/alterar setores",
  "upsert:permissions": "Permite gerenciar as permissões dos usuários",
  "upsert:workspaces": "Permite gerenciar as áreas de trabalho",
  "view:products": "Permite listar todos os produtos no estoque",
  "manage:cart": "Permite gerenciar os carrinhos",
  "view:conversation":
    "Permite visualizar atendimentos abertos para o setor do usuário, sem atendente atribuído ou atendimentos atribuídos ao próprio usuário",
  "view:conversations": "Permite visualizar todos os atendimentos",
  "send:message": "Permite enviar mensagens",
} as const;

export type PolicyName = keyof typeof permissions;

export class AuthorizationService {
  can(actions: PolicyName | PolicyName[], user: User, membership: Membership) {
    if (user.isSuperUser()) return true;

    if (typeof actions !== "object") {
      return membership.hasPermission(actions);
    }

    if (!actions.length) {
      return true;
    }

    return actions
      .map((action) => membership.hasPermission(action))
      .some((allow) => allow);
  }

  static instance() {
    return new AuthorizationService();
  }
}
