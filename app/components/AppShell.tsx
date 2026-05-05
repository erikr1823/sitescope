"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import SiteScopeLogo from "./SiteScopeLogo";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/clients", label: "Clients" },
  { href: "/clients/new", label: "New Client" },
  { href: "/assets", label: "Assets" },
  { href: "/scan", label: "Network Scan" },
] as const;

function isNavActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/clients/new") {
    return pathname === "/clients/new" || pathname.startsWith("/clients/new/");
  }
  if (href === "/clients") {
    if (pathname === "/clients/new" || pathname.startsWith("/clients/new/")) {
      return false;
    }
    return pathname.startsWith("/clients") || pathname.startsWith("/sites/");
  }
  if (href === "/assets") return pathname.startsWith("/assets");
  if (href === "/scan") return pathname === "/scan" || pathname.startsWith("/scan/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileMenuOpen]);

  return (
    <div className="app-shell">
      <header className="mobile-topbar">
        <Link
          href="/"
          className="mobile-topbar__brand"
          onClick={() => setMobileMenuOpen(false)}
        >
          <SiteScopeLogo subtitle="IT Asset Management" />
        </Link>
        <button
          type="button"
          className="mobile-topbar__menu-btn"
          aria-expanded={mobileMenuOpen}
          aria-controls="site-mobile-nav"
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          {mobileMenuOpen ? "Close" : "Menu"}
        </button>
      </header>

      {mobileMenuOpen ? (
        <>
          <button
            type="button"
            className="mobile-nav__backdrop"
            aria-label="Close menu"
            onClick={() => setMobileMenuOpen(false)}
          />
          <nav
            id="site-mobile-nav"
            className="mobile-nav"
            aria-label="Main navigation"
          >
            {NAV_ITEMS.map((item) => {
              const active = isNavActive(item.href, pathname);
              return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "sidebar__link sidebar__link--active" : "sidebar__link"}
                aria-current={active ? "page" : undefined}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
              );
            })}
          </nav>
        </>
      ) : null}

      <aside className="sidebar" aria-label="Sidebar">
        <div className="sidebar__brand">
          <SiteScopeLogo subtitle="Asset Operations Console" />
        </div>

        <nav className="sidebar__nav" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const active = isNavActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={active ? "sidebar__link sidebar__link--active" : "sidebar__link"}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <p className="sidebar__footer">
          Hardware, sites, and inventory in one operational view.
        </p>
      </aside>

      <div className="workspace">
        <header className="top-header">
          <div className="top-header__inner">
            <p className="top-header__title">Operations workspace</p>
            <p className="top-header__meta">
              Clients, locations, and asset lifecycle
            </p>
          </div>
          <div className="top-header__brand-chip" aria-hidden="true">
            <SiteScopeLogo compact />
            <span className="top-header__brand-chip-label">SiteScope</span>
          </div>
        </header>
        <div className="workspace__content">{children}</div>
      </div>
    </div>
  );
}
