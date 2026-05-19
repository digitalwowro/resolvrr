import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resolvrr",
  description: "A helpdesk workspace for support agents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="text-sm">{children}</body>
    </html>
  );
}
