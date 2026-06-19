"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import {
  List,
  Upload,
  Sparkles,
  Ticket,
  CheckCircle,
  Settings,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/draws", label: "Tirages", icon: List },
  { href: "/draws/import", label: "Importer", icon: Upload },
  { href: "/predict", label: "Prédictions", icon: Sparkles },
  { href: "/tickets", label: "Mes tickets", icon: Ticket },
  { href: "/verify", label: "Vérifier", icon: CheckCircle },
  { href: "/settings", label: "Paramètres", icon: Settings },
];

function isActive(pathname: string, href: string) {
  if (href === "/draws" && pathname.startsWith("/draws/import")) return false;
  return pathname === href || pathname.startsWith(href + "/");
}

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold text-emerald-700">
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

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="hidden md:flex"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </Button>

          {/* Hamburger mobile */}
          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
              <button
                className="flex h-10 w-10 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 md:hidden"
                aria-label="Ouvrir le menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </Dialog.Trigger>

            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
              <Dialog.Content
                className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left duration-300"
              >
                {/* Drawer header */}
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <Link
                    href="/"
                    className="text-lg font-bold text-emerald-700"
                    onClick={() => setOpen(false)}
                  >
                    Lotto MU
                  </Link>
                  <Dialog.Close asChild>
                    <button
                      className="flex h-9 w-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
                      aria-label="Fermer le menu"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </Dialog.Close>
                </div>

                {/* Nav links */}
                <nav className="flex-1 overflow-y-auto px-3 py-4">
                  <ul className="space-y-1">
                    {navItems.map((item) => {
                      const active = isActive(pathname, item.href);
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className={cn(
                              "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                              active
                                ? "bg-emerald-50 text-emerald-700"
                                : "text-gray-700 hover:bg-gray-50"
                            )}
                          >
                            <item.icon className="h-5 w-5 shrink-0" />
                            {item.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </nav>

                {/* Footer */}
                <div className="border-t px-3 py-4">
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="flex h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    <LogOut className="h-5 w-5 shrink-0" />
                    Déconnexion
                  </button>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
    </header>
  );
}
