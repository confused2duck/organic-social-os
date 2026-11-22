"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Sparkles } from "lucide-react";
import { NAV_ITEMS, NAV_SECTIONS } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      <button
        aria-label="Open navigation"
        onClick={() => setOpen(true)}
        className="flex size-9 items-center justify-center rounded-md border border-input bg-card"
      >
        <Menu className="size-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <nav className="absolute left-0 top-0 flex h-full w-72 max-w-[85%] flex-col sidebar-gradient text-white shadow-xl">
            <div className="flex items-center justify-between px-5 py-4">
              <span className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary/90"><Sparkles className="size-4" /></span>
                <span className="text-sm font-semibold">Organic Social OS</span>
              </span>
              <button aria-label="Close navigation" onClick={() => setOpen(false)} className="rounded-md p-1 hover:bg-white/10">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto px-3 pb-6 scrollbar-thin">
              {NAV_SECTIONS.map((section) => {
                const items = NAV_ITEMS.filter((i) => i.section === section.key);
                return (
                  <div key={section.key}>
                    <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">{section.label}</p>
                    <ul className="space-y-0.5">
                      {items.map((item) => {
                        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                        const Icon = item.icon;
                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              onClick={() => setOpen(false)}
                              className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm", active ? "bg-white/15 font-medium text-white" : "text-white/70 hover:bg-white/10")}
                            >
                              <Icon className="size-4 shrink-0" />
                              <span className="truncate">{item.label}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
