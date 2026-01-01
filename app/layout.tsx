import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
