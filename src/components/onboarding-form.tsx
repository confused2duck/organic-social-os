"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { PLATFORMS, PLATFORM_LABELS } from "@/lib/enums";
import { createCompanyAction } from "@/app/actions/companies";

export function OnboardingForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [platforms, setPlatforms] = useState<string[]>(["LINKEDIN", "INSTAGRAM"]);
  const [error, setError] = useState<string | null>(null);

  function toggle(p: string) {
    setPlatforms((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]));
  }

  function submit() {
    setError(null);
    start(async () => {
      const res = await createCompanyAction({ name, industry, website, timezone, platforms: platforms as never });
      if (res.ok) router.push("/brand");
      else setError(res.error ?? "Failed to create company");
    });
  }

  return (
    <Card className="glass mx-auto max-w-xl shadow-lg">
      <div className="sunset-gradient rounded-t-xl px-6 py-5 text-white">
        <div className="flex items-center gap-2"><Building2 className="size-5" /><span className="font-semibold">New company workspace</span></div>
        <p className="mt-1 text-sm text-white/80">Set up a workspace. Its brand, content and data stay fully isolated.</p>
      </div>
      <CardContent className="space-y-4 p-6">
        <div>
          <Label htmlFor="name">Company name *</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Co." className="mt-1" />
        </div>
        <div>
          <Label htmlFor="industry">Industry</Label>
          <Input id="industry" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="B2B SaaS" className="mt-1" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="website">Website</Label>
            <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="tz">Time zone</Label>
            <Input id="tz" value={timezone} onChange={(e) => setTimezone(e.target.value)} className="mt-1" />
          </div>
        </div>
        <div>
          <Label>Organic platforms *</Label>
          <div className="mt-2 flex flex-wrap gap-3">
            {PLATFORMS.map((p) => (
              <label key={p} className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm">
                <Checkbox checked={platforms.includes(p)} onCheckedChange={() => toggle(p)} /> {PLATFORM_LABELS[p]}
              </label>
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button onClick={submit} disabled={pending || !name || platforms.length === 0} className="w-full">
          {pending ? <Loader2 className="animate-spin" /> : null} Create workspace
        </Button>
        <p className="text-xs text-muted-foreground">Data is kept strictly separate from other companies. You can add brand knowledge, research and a calendar next.</p>
      </CardContent>
    </Card>
  );
}
