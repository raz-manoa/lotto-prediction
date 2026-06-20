"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import {
  List,
  Upload,
  Sparkles,
  Ticket,
  CheckCircle,
  Settings,
  LogOut,
  MoreHorizontal,
  BarChart3,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/draws", label: "Tirages", icon: List },
  { href: "/analysis", label: "Analyse", icon: BarChart3 },
  { href: "/draws/import", label: "Importer", icon: Upload },
  { href: "/predict", label: "Prédictions", icon: Sparkles },
  { href: "/tickets", label: "Mes tickets", icon: Ticket },
  { href: "/verify", label: "Vérifier", icon: CheckCircle },
  { href: "/settings", label: "Paramètres", icon: Settings },
];

const mobileTabs = [
  { href: "/draws", label: "Tirages", icon: List },
  { href: "/predict", label: "Prédire", icon: Sparkles },
  { href: "/tickets", label: "Tickets", icon: Ticket },
  { href: "/verify", label: "Vérifier", icon: CheckCircle },
] as const;

const moreItems = [
  { href: "/analysis", label: "Analyse", icon: BarChart3 },
  { href: "/draws/import", label: "Importer", icon: Upload },
  { href: "/settings", label: "Paramètres", icon: Settings },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/draws" && pathname.startsWith("/draws/import")) return false;
  return pathname === href || pathname.startsWith(href + "/");
}

function isMoreActive(pathname: string) {
  return (
    pathname.startsWith("/analysis") ||
    pathname.startsWith("/draws/import") ||
    pathname.startsWith("/settings")
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 shadow-navbar backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/draws" className="text-lg font-bold text-emerald-700">
            Lotto MU
          </Link>

          {/* Desktop nav */}
          <nav className="hidden gap-1 md:flex">
            {navItems.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="hidden md:flex"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </Button>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 bg-white/95 shadow-navbar-up backdrop-blur-sm md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        aria-label="Navigation principale"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {mobileTabs.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-1 py-2.5 transition-colors",
                  active ? "text-emerald-600" : "text-gray-500 active:text-gray-700"
                )}
                aria-current={active ? "page" : undefined}
              >
                <item.icon
                  className={cn("h-5 w-5", active && "stroke-[2.5]")}
                />
                <span className="text-[10px] font-medium leading-tight">
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* More tab */}
          <Dialog.Root open={moreOpen} onOpenChange={setMoreOpen}>
            <Dialog.Trigger asChild>
              <button
                className={cn(
                  "flex flex-col items-center gap-0.5 px-1 py-2.5 transition-colors",
                  isMoreActive(pathname) || moreOpen
                    ? "text-emerald-600"
                    : "text-gray-500 active:text-gray-700"
                )}
                aria-label="Plus d'options"
              >
                <MoreHorizontal
                  className={cn(
                    "h-5 w-5",
                    (isMoreActive(pathname) || moreOpen) && "stroke-[2.5]"
                  )}
                />
                <span className="text-[10px] font-medium leading-tight">
                  Plus
                </span>
              </button>
            </Dialog.Trigger>

            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
              <Dialog.Content
                className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white shadow-xl outline-none"
                style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
              >
                <div className="mx-auto mb-3 mt-3 h-1 w-10 rounded-full bg-gray-300" />
                <Dialog.Title className="sr-only">Plus d&apos;options</Dialog.Title>

                <ul className="px-3 pb-4">
                  {moreItems.map((item) => {
                    const active = isActive(pathname, item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setMoreOpen(false)}
                          className={cn(
                            "flex h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                            active
                              ? "bg-emerald-50 text-emerald-700"
                              : "text-gray-700 active:bg-gray-50"
                          )}
                        >
                          <item.icon className="h-5 w-5 shrink-0" />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                  <li className="mt-1 pt-1">
                    <button
                      onClick={() => {
                        setMoreOpen(false);
                        signOut({ callbackUrl: "/login" });
                      }}
                      className="flex h-12 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium text-red-600 active:bg-red-50"
                    >
                      <LogOut className="h-5 w-5 shrink-0" />
                      Déconnexion
                    </button>
                  </li>
                </ul>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </nav>
    </>
  );
}
