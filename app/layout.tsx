import type { ReactNode } from "react";
import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import AppShell from "./components/AppShell";
import { AppUserProvider } from "./components/AppUserProvider";
import ServiceWorkerRegister from "./components/ServiceWorkerRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "SiteScope",
  description: "IT asset management — clients, sites, and hardware inventory",
  applicationName: "SiteScope",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SiteScope",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#3b82f6",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ClerkProvider>
          <ServiceWorkerRegister />
          <AppUserProvider>
            <AppShell>{children}</AppShell>
          </AppUserProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
