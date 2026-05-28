"use client";

import { Show, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import SiteScopeLogo from "./SiteScopeLogo";
import { useAppUser } from "./AppUserProvider";

const DESKTOP_NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/clients", label: "Clients" },
  { href: "/clients/new", label: "New Client" },
  { href: "/assets", label: "Inventory" },
  { href: "/queue", label: "Work Queue" },
  { href: "/scan", label: "Network Scan" },
] as const;

const MOBILE_NAV_ITEMS = [
  { href: "/clients", label: "Sites", match: (pathname: string) =>
      pathname.startsWith("/clients") || pathname.startsWith("/sites/") },
  { href: "/assets", label: "Assets", match: (pathname: string) => pathname.startsWith("/assets") },
  { href: "/scan", label: "Scan", match: (pathname: string) =>
      pathname === "/scan" || pathname.startsWith("/scan/") },
  { href: "/notes", label: "Notes", match: (pathname: string) => pathname.startsWith("/notes") },
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
  if (href === "/queue") return pathname === "/queue" || pathname.startsWith("/queue/");
  if (href === "/scan") return pathname === "/scan" || pathname.startsWith("/scan/");
  if (href === "/admin/users") return pathname.startsWith("/admin/users");
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { isAdmin } = useAppUser();
  const isAuthPage = pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");

  if (isAuthPage) {
    return <>{children}</>;
  }

  const desktopItems = isAdmin
    ? [...DESKTOP_NAV_ITEMS, { href: "/admin/users", label: "Users" as const }]
    : DESKTOP_NAV_ITEMS;

  return (
    <div className="app-shell">
      <header className="mobile-topbar">
        <Link href="/" className="mobile-topbar__brand">
          <SiteScopeLogo subtitle="IT Asset Management" />
        </Link>
        <Show when="signed-in">
          <div className="mobile-topbar__user">
            <UserButton />
          </div>
        </Show>
      </header>

      <aside className="sidebar" aria-label="Sidebar">
        <div className="sidebar__brand">
          <SiteScopeLogo subtitle="Asset Operations Console" />
        </div>

        <nav className="sidebar__nav" aria-label="Main navigation">
          {desktopItems.map((item) => {
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
            <p className="top-header__meta">Clients, locations, and asset lifecycle</p>
          </div>
          <div className="top-header__actions">
            <div className="top-header__brand-chip" aria-hidden="true">
              <SiteScopeLogo compact />
              <span className="top-header__brand-chip-label">SiteScope</span>
            </div>
            <Show when="signed-in">
              <div className="top-header__user">
                <UserButton />
              </div>
            </Show>
            <Show when="signed-out">
              <Link href="/sign-in" className="btn-secondary">
                Sign in
              </Link>
            </Show>
          </div>
        </header>
        <div className="workspace__content">{children}</div>
      </div>

      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {MOBILE_NAV_ITEMS.map((item) => {
          const active = item.match(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? "mobile-bottom-nav__link mobile-bottom-nav__link--active"
                  : "mobile-bottom-nav__link"
              }
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
