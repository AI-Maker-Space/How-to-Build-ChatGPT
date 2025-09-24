import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChatGPT Clone",
  description: "An OpenAI Responses API powered ChatGPT-style experience.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface text-gray-900">
        {children}
      </body>
    </html>
  );
}
