import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";

export const metadata = {
  title: "SiteScope",
  description: "Client management",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <aside className="sidebar">
            <div className="sidebar__brand">
              <span className="sidebar__dot" aria-hidden="true" />
              <div>
                <p className="sidebar__label">SiteScope</p>
                <p className="sidebar__subtle">IT Asset Dashboard</p>
              </div>
            </div>

            <nav className="sidebar__nav" aria-label="Main navigation">
              <Link href="/clients" className="sidebar__link">
                Clients
              </Link>
              <Link href="/clients/new" className="sidebar__link">
                New Client
              </Link>
            </nav>
          </aside>

          <div className="workspace">
            <header className="top-header">
              <p className="top-header__title">Infrastructure Overview</p>
              <p className="top-header__meta">Operations Console</p>
            </header>
            <div className="workspace__content">{children}</div>
          </div>
        </div>
      </body>
    </html>
  );
}
