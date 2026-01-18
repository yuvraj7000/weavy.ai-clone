import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Weavy.ai LLM Workflow Builder",
  description: "Visual workflow builder for LLM workflows using Google Gemini",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
    <html lang="en">
      <body className="antialiased">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
    </ClerkProvider>
  );
}
