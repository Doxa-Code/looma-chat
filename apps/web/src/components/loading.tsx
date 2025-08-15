import { Logo } from "./logo";

export const LoadingComponent = () => {
  return (
    <div className="fixed flex-col gap-1 inset-0 z-[999] flex items-center justify-center bg-white/70 backdrop-blur-sm">
      <Logo className="size-20 motion-preset-stretch " />
      <span className="animate-pulse">Carregando...</span>
    </div>
  );
};
