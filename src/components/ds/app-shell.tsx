"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu as MenuIcon, PanelLeft, X } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { t } from "@/i18n/nb";
import { Icon } from "./icon";

export type NavItem = { href: string; label: string; exact?: boolean };
export type NavGroup = { label?: string; items: NavItem[] };

const isCurrent = (pathname: string, item: NavItem) =>
  item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

function Nav({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label={t.ds.mainNav} className="flex flex-col gap-6">
      {groups.map((group, i) => (
        <div key={group.label ?? i} className="flex flex-col gap-1">
          {group.label && <p className="px-3 pb-1 text-label text-ink-secondary">{group.label}</p>}
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => {
              const current = isCurrent(pathname, item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={current ? "page" : undefined}
                    className={`flex min-h-11 items-center rounded-sm px-3 text-body transition-colors duration-[120ms] md:min-h-9 ${
                      current ? "bg-active font-medium text-ink" : "text-ink-secondary hover:bg-active/60 hover:text-ink"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

// The page title in the mobile top bar comes from <title> ("Side – Kundeportal").
function usePageTitle(fallback: string) {
  const pathname = usePathname();
  const [title, setTitle] = useState(fallback);
  useEffect(() => {
    const update = () => setTitle(document.title.split(" – ")[0] || fallback);
    update();
    const observer = new MutationObserver(update);
    const node = document.querySelector("title");
    if (node) observer.observe(node, { childList: true });
    return () => observer.disconnect();
  }, [pathname, fallback]);
  return title;
}

const STORAGE_KEY = "portal.sidebar";
const CHANGE_EVENT = "portal:sidebar";

// The sidebar choice lives in localStorage (a per-viewer convenience). Read it as an external
// store, so the server renders it open and the browser takes over without a mismatch.
function readCollapsed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "collapsed";
  } catch {
    return false;
  }
}
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}
function writeCollapsed(collapsed: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, collapsed ? "collapsed" : "open");
  } catch {
    // Storage can be blocked; the choice then lasts until the page reloads.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

// App shell (DESIGN.md, Layout): index sidebar on desktop, slide-over drawer on tablet,
// slim top bar with a full-height menu on mobile. Pages sit on a reading sheet.
export function AppShell({
  brand,
  groups,
  footer,
  children,
  wide = false,
}: {
  brand: ReactNode;
  groups: NavGroup[];
  footer?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawer = useRef<HTMLDialogElement>(null);
  const title = usePageTitle(t.app.name);
  const toggleSidebar = () => writeCollapsed(!collapsed);

  useEffect(() => {
    const d = drawer.current;
    if (!d) return;
    if (drawerOpen && !d.open) d.showModal();
    if (!drawerOpen && d.open) d.close();
  }, [drawerOpen]);

  const sidebar = (onNavigate?: () => void) => (
    <div className="flex min-h-full flex-col gap-8 p-4">
      <div className={`px-3 pt-2 text-title-s ${onNavigate ? "pr-12" : ""}`}>{brand}</div>
      <div className="flex-1">
        <Nav groups={groups} onNavigate={onNavigate} />
      </div>
      {footer && <div className="border-t border-hairline px-3 pt-4">{footer}</div>}
    </div>
  );

  return (
    <div className={`min-h-dvh lg:grid ${collapsed ? "lg:grid-cols-[0_1fr]" : "lg:grid-cols-[260px_1fr]"}`}>
      {/* Desktop sidebar */}
      <aside className={`hidden bg-subtle lg:block ${collapsed ? "invisible" : ""}`}>
        <div className="sticky top-0 flex h-dvh flex-col overflow-y-auto">{sidebar()}</div>
      </aside>

      {/* Mobile and tablet top bar */}
      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-hairline bg-canvas/95 px-2 backdrop-blur lg:hidden">
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={drawerOpen}
          aria-label={t.ds.openMenu}
          onClick={() => setDrawerOpen(true)}
          className="flex size-11 items-center justify-center rounded-sm text-ink hover:bg-subtle"
        >
          <Icon icon={MenuIcon} />
        </button>
        <p className="min-w-0 truncate text-title-s">{title}</p>
      </header>

      {/* Drawer: full height on mobile, slide-over on tablet */}
      <dialog
        ref={drawer}
        aria-label={t.ds.mainNav}
        onClose={() => setDrawerOpen(false)}
        onClick={(e) => {
          if (e.target === drawer.current) setDrawerOpen(false);
        }}
        className="m-0 h-dvh max-h-dvh w-full max-w-full bg-subtle p-0 text-ink backdrop:bg-ink/30 md:w-80"
      >
        <div className="relative h-full overflow-y-auto">
          <button
            type="button"
            aria-label={t.ds.closeMenu}
            onClick={() => setDrawerOpen(false)}
            className="absolute right-2 top-2 flex size-11 items-center justify-center rounded-sm text-ink-secondary hover:bg-active hover:text-ink"
          >
            <Icon icon={X} />
          </button>
          {sidebar(() => setDrawerOpen(false))}
        </div>
      </dialog>

      <div className="relative min-w-0">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-expanded={!collapsed}
          aria-label={collapsed ? t.ds.showSidebar : t.ds.hideSidebar}
          className="absolute left-3 top-3 hidden size-8 items-center justify-center rounded-sm text-ink-secondary hover:bg-subtle hover:text-ink lg:flex"
        >
          <Icon icon={PanelLeft} />
        </button>
        <main id="main" className="px-0 py-0 md:px-8 md:py-8 lg:px-12 lg:py-12">
          <div
            className={`mx-auto w-full bg-sheet px-4 py-6 md:rounded-md md:border md:border-hairline md:px-8 md:py-10 lg:px-12 ${
              wide ? "max-w-[1100px]" : "max-w-[840px]"
            }`}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
