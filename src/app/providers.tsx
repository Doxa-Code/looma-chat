"use client";

import { GlobalLoader } from "@/components/global-loader";
import { Toaster } from "@/components/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: React.PropsWithChildren) {
  const [client] = useState(new QueryClient());

  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster />
      <GlobalLoader />
    </QueryClientProvider>
  );
}
