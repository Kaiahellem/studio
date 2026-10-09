"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileText,
  Folder,
  LayoutGrid,
  Menu as MenuIcon,
  MessageSquarePlus,
  Package,
  PanelLeft,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { t } from "@/i18n/nb";
import { Icon } from "./icon";

// Icons by name, so server layouts can describe the navigation without passing functions.
const icons = {
  overview: LayoutGrid,
  documents: FileText,
  files: Folder,
  requests: MessageSquarePlus,
  maintenance: Wrench,
  handover: Package,
} satisfies Record<string, LucideIcon>;

export type NavIcon = keyof typeof icons;
export type NavItem = { href: string; label: string; exact?: boolean; icon?: NavIcon };
export type NavGroup = { label?: string; items: NavItem[] };

const isCurrent = (pathname: string, item: NavItem) =>
  item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

// 36px rows (44px on mobile), 8px radius, --hover on hover, --selected when active; icons in
// --ink-secondary, label in --ink (DESIGN.md, Navigation items).
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
                    className={`flex min-h-11 items-center gap-3 rounded-nav px-3 text-body text-ink transition-colors duration-[120ms] md:min-h-9 ${
                      current ? "bg-selected font-medium" : "hover:bg-hover"
                    }`}
                  >
                    {item.icon && <Icon icon={icons[item.icon]} className="text-ink-secondary" />}
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

// The top bar turns translucent once content scrolls under it.
function useScrolled() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return scrolled;
}

// App shell (DESIGN.md, Layout): a sidebar on the same canvas as the page with no divider;
// page content directly on the canvas, no outer sheet. Tablet: slide-over drawer. Mobile:
// sticky top bar and a full-height navigation sheet.
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
  const scrolled = useScrolled();

  useEffect(() => {
    const d = drawer.current;
    if (!d) return;
    if (drawerOpen && !d.open) d.showModal();
    if (!drawerOpen && d.open) d.close();
  }, [drawerOpen]);

  const sidebar = (inDrawer: boolean) => (
    <div className="flex min-h-full flex-col gap-8 p-4">
      <div className={`px-3 pt-2 text-title-s ${inDrawer ? "pr-12" : ""}`}>{brand}</div>
      <div className="flex-1">
        <Nav groups={groups} onNavigate={inDrawer ? () => setDrawerOpen(false) : undefined} />
      </div>
      {footer && <div className="px-3 pb-2">{footer}</div>}
    </div>
  );

  return (
    <div className={`min-h-dvh bg-canvas lg:grid ${collapsed ? "lg:grid-cols-[0_1fr]" : "lg:grid-cols-[260px_1fr]"}`}>
      {/* Desktop sidebar, on the same canvas as the page */}
      <aside className={`hidden lg:block ${collapsed ? "invisible" : ""}`}>
        <div className="sticky top-0 flex h-dvh flex-col overflow-y-auto">{sidebar(false)}</div>
      </aside>

      {/* Mobile and tablet top bar */}
      <header
        className={`sticky top-0 z-20 flex h-14 items-center gap-2 px-2 transition-colors duration-[120ms] lg:hidden ${
          scrolled ? "bg-canvas supports-[backdrop-filter]:bg-canvas/80 supports-[backdrop-filter]:backdrop-blur-[20px]" : "bg-canvas"
        }`}
      >
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={drawerOpen}
          aria-label={t.ds.openMenu}
          onClick={() => setDrawerOpen(true)}
          className="flex size-11 items-center justify-center rounded-nav text-ink hover:bg-hover"
        >
          <Icon icon={MenuIcon} />
        </button>
        <p className="min-w-0 truncate text-title-s">{title}</p>
      </header>

      {/* Navigation: full-height sheet on mobile, slide-over card on tablet */}
      <dialog
        ref={drawer}
        aria-label={t.ds.mainNav}
        onClose={() => setDrawerOpen(false)}
        onClick={(e) => {
          if (e.target === drawer.current) setDrawerOpen(false);
        }}
        className="m-0 h-dvh max-h-dvh w-full max-w-full bg-card p-0 text-ink shadow-overlay ring-1 ring-card-edge backdrop:bg-backdrop md:w-80 md:rounded-r-dialog"
      >
        <div className="relative h-full overflow-y-auto">
          <button
            type="button"
            aria-label={t.ds.closeMenu}
            onClick={() => setDrawerOpen(false)}
            className="absolute right-2 top-2 flex size-11 items-center justify-center rounded-nav text-ink-secondary hover:bg-hover hover:text-ink"
          >
            <Icon icon={X} />
          </button>
          {sidebar(true)}
        </div>
      </dialog>

      <div className="relative min-w-0">
        <button
          type="button"
          onClick={() => writeCollapsed(!collapsed)}
          aria-expanded={!collapsed}
          aria-label={collapsed ? t.ds.showSidebar : t.ds.hideSidebar}
          className="absolute left-3 top-3 hidden size-9 items-center justify-center rounded-nav text-ink-secondary hover:bg-hover hover:text-ink lg:flex"
        >
          <Icon icon={PanelLeft} />
        </button>
        {/* Page margins: 16px mobile, 32px tablet, 48px desktop. No sheet around the page. */}
        <main id="main" className="px-4 pb-16 pt-4 md:px-8 md:pt-8 lg:px-12 lg:pt-12">
          <div className={`mx-auto w-full ${wide ? "max-w-[1100px]" : "max-w-[840px]"}`}>{children}</div>
        </main>
      </div>
    </div>
  );
}
