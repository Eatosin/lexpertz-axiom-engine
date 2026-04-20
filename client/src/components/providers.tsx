"use client";

import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/next/app";

export function DashboardProviders({ children }: { children: React.ReactNode }) {
  // SOTA: Initialize QueryClient inside component state to ensure 
  // data is not shared across users and requests during SSR.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 5, // Data stays fresh for 5 minutes
            refetchOnWindowFocus: false, // Prevents spamming your FastAPI server
            retry: 1, // Only retry once if backend fails
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {/* nuqs requires this adapter in Next.js 15+ to handle URL state smoothly */}
      <NuqsAdapter>
        {children}
      </NuqsAdapter>
    </QueryClientProvider>
  );
}
