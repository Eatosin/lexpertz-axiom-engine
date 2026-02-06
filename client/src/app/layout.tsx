import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { Suspense } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { Loader2 } from "lucide-react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Axiom Engine | Enterprise Verification",
  description: "Evidence-gated agentic RAG for regulated industries.",
};

function GlobalLoading() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-zinc-950">
      <Loader2 className="h-8 w-8 animate-spin text-brand-cyan" />
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark h-full">
        <body className={`${inter.className} bg-zinc-950 text-zinc-50 antialiased h-full`}>
          <NuqsAdapter>
            <Suspense fallback={<GlobalLoading />}>
              <AppSidebar>
                {children}
              </AppSidebar>
            </Suspense>
          </NuqsAdapter>
        </body>
      </html>
    </ClerkProvider>
  );
}
