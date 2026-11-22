"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, ChevronsUpDown, Plus, Building2 } from "lucide-react";
import { switchCompanyAction } from "@/app/actions/companies";
import { cn, initials } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export interface CompanyOption {
  id: string;
  name: string;
  slug: string;
  isDemo: boolean;
  dataLabel: string;
}

export function CompanySwitcher({ companies, activeId }: { companies: CompanyOption[]; activeId: string | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const active = companies.find((c) => c.id === activeId) ?? companies[0];

  function select(id: string) {
    setOpen(false);
    if (id === active?.id) return;
    startTransition(async () => {
      await switchCompanyAction(id);
      router.refresh();
    });
  }

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger
        className={cn(
          "flex min-w-[220px] items-center gap-2.5 rounded-lg border border-input bg-card px-3 py-1.5 text-left text-sm shadow-sm transition-colors hover:bg-secondary",
          isPending && "opacity-60",
        )}
      >
        <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
          {active ? initials(active.name) : <Building2 className="size-4" />}
        </span>
        <span className="flex-1 truncate">
          <span className="block truncate font-medium">{active?.name ?? "No workspace"}</span>
        </span>
        <ChevronsUpDown className="size-4 text-muted-foreground" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 min-w-[260px] rounded-lg border bg-popover p-1.5 text-popover-foreground shadow-lg"
        >
          <DropdownMenu.Label className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Company workspaces
          </DropdownMenu.Label>
          {companies.map((c) => (
            <DropdownMenu.Item
              key={c.id}
              onSelect={(e) => {
                e.preventDefault();
                select(c.id);
              }}
              className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm outline-none data-[highlighted]:bg-secondary"
            >
              <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
                {initials(c.name)}
              </span>
              <span className="flex-1 truncate">
                <span className="block truncate font-medium">{c.name}</span>
                {c.dataLabel === "illustrative_fixture" && (
                  <Badge tone="muted" className="mt-0.5">Demo fixture</Badge>
                )}
              </span>
              {c.id === active?.id && <Check className="size-4 text-primary" />}
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="my-1 h-px bg-border" />
          <DropdownMenu.Item
            onSelect={(e) => {
              e.preventDefault();
              setOpen(false);
              router.push("/onboarding");
            }}
            className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm font-medium outline-none data-[highlighted]:bg-secondary"
          >
            <span className="flex size-7 items-center justify-center rounded-md border border-dashed border-input">
              <Plus className="size-4" />
            </span>
            Create company workspace
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
