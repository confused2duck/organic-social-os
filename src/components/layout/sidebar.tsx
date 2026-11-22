import Link from "next/link";
import { Sparkles } from "lucide-react";
import { NavLinks } from "./nav-links";

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col sidebar-gradient text-white md:flex">
      <Link href="/" className="flex items-center gap-2.5 px-5 py-4">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/90 text-primary-foreground">
          <Sparkles className="size-5" />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">Organic Social OS</span>
          <span className="text-[11px] text-white/50">Autonomous social manager</span>
        </span>
      </Link>
      <NavLinks />
      <div className="border-t border-white/10 px-5 py-3 text-[11px] text-white/40">
        Accuracy-first · No fabricated results
      </div>
    </aside>
  );
}
