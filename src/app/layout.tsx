import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Organic Social OS",
  description: "Autonomous Organic Social Media management — multi-tenant SaaS.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
