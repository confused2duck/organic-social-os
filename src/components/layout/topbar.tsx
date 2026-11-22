import { listCompanies, getActiveCompanyId } from "@/lib/tenant";
import { CompanySwitcher } from "./company-switcher";
import { TopbarTitle } from "./topbar-title";
import { MobileNav } from "./mobile-nav";
import { Badge } from "@/components/ui/badge";

export async function Topbar() {
  const [companies, activeId] = await Promise.all([listCompanies(), getActiveCompanyId()]);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-card/80 px-4 backdrop-blur md:px-6">
      <MobileNav />
      <CompanySwitcher
        companies={companies.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          isDemo: c.isDemo,
          dataLabel: c.dataLabel,
        }))}
        activeId={activeId ?? companies[0]?.id ?? null}
      />
      <div className="hidden md:block">
        <TopbarTitle />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Badge tone="muted" className="hidden sm:inline-flex">
          Local testing build
        </Badge>
      </div>
    </header>
  );
}
