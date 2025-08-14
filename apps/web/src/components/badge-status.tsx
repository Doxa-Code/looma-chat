import { StatusValue } from "@looma/core/domain/value-objects/status";
import { Badge } from "./ui/badge";

type Props = {
  status: StatusValue;
};
export const BadgeStatus: React.FC<Props> = (props) => {
  if (props.status === "budget") {
    return <Badge className="bg-amber-500">Em orçamento</Badge>;
  }

  if (props.status === "cancelled") {
    return <Badge className="bg-rose-500">Cancelado</Badge>;
  }

  if (props.status === "expired") {
    return <Badge className="bg-muted text-muted-foreground">Expirado</Badge>;
  }

  if (props.status === "finished") {
    return <Badge className="bg-green-500">Finalizado</Badge>;
  }

  if (props.status === "order") {
    return <Badge className="bg-primary">Pedido realizado</Badge>;
  }

  if (props.status === "shipped") {
    return <Badge className="bg-teal-500">Entrega</Badge>;
  }

  return <></>;
};
