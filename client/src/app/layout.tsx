import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Axiom Engine | Enterprise Verification",
  description: "Evidence-gated agentic RAG for regulated industries.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider 
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
    >
      <html lang="en" className="dark">
        <body className={`${inter.className} bg-zinc-950 text-zinc-50 antialiased h-full`}>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
