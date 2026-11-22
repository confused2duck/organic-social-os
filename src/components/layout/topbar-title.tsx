"use client";

import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/nav";

export function TopbarTitle() {
  const pathname = usePathname();
  const match =
    NAV_ITEMS.filter((i) => (i.href === "/" ? pathname === "/" : pathname.startsWith(i.href))).sort(
      (a, b) => b.href.length - a.href.length,
    )[0] ?? NAV_ITEMS[0];
  return <h1 className="text-base font-semibold tracking-tight">{match?.label ?? "Overview"}</h1>;
}
