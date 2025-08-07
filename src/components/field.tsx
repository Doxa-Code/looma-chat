import { cx } from "@/lib/utils";

export const Field: React.FC<
  React.PropsWithChildren & { className?: string }
> = (props) => (
  <div className={cx("flex flex-col gap-2", props.className)}>
    {props.children}
  </div>
);
