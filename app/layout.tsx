import type { ReactNode } from "react";
import AppShell from "./components/AppShell";
import "./globals.css";

export const metadata = {
  title: "SiteScope",
  description: "IT asset management — clients, sites, and hardware inventory",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
