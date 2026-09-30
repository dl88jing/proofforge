"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Anvil, BookOpen, Inbox, ScrollText } from "lucide-react";
import { HOUSEHOLD } from "@/lib/household";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Forge", icon: Anvil },
  { href: "/intake", label: "Intake", icon: Inbox },
  { href: "/missions", label: "Missions", icon: ScrollText },
  { href: "/ledger", label: "Ledger", icon: BookOpen },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border/80 bg-[oklch(0.15_0.015_70)]">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-md border border-primary/40 bg-primary/10 text-primary">
              <Anvil className="size-4" />
            </span>
            <span className="leading-tight">
              <span className="block font-heading text-lg tracking-wide">
                {HOUSEHOLD.name} {HOUSEHOLD.product}
              </span>
              <span className="block text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Avery & Morgan · household operators
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            {NAV.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="size-3.5" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      <footer className="border-t border-border/80 px-4 py-4 text-center text-xs text-muted-foreground sm:px-6">
        {HOUSEHOLD.tagline} Built for Colosseum Crypto World&apos;s Fair · submit 12 Oct 2026 11:59pm PT.
        No custody. Human accept before Solana settle.
      </footer>
    </div>
  );
}
