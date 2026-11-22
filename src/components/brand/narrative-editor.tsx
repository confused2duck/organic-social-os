"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StringListInput } from "./fields";
import { updateNarrativeAction } from "@/app/actions/brand";

export interface NarrativeValue {
  name: string;
  website: string;
  industry: string;
  tagline: string;
  description: string;
  positioning: string;
  valueProps: string[];
  keyMessages: string[];
  differentiators: string[];
  objectives: string[];
  audiencePriorities: string[];
  markets: string[];
}

export function NarrativeEditor({ initial }: { initial: NarrativeValue }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [v, setV] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const set = <K extends keyof NarrativeValue>(k: K, val: NarrativeValue[K]) => setV((s) => ({ ...s, [k]: val }));

  function save() {
    setMsg(null);
    start(async () => {
      const res = await updateNarrativeAction(v);
      setMsg(res.ok ? "Saved — future research, strategy and content will use this." : res.error ?? "Failed");
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label>Company name</Label><Input className="mt-1" value={v.name} onChange={(e) => set("name", e.target.value)} /></div>
        <div><Label>Industry</Label><Input className="mt-1" value={v.industry} onChange={(e) => set("industry", e.target.value)} /></div>
        <div><Label>Website</Label><Input className="mt-1" value={v.website} onChange={(e) => set("website", e.target.value)} /></div>
        <div><Label>Tagline</Label><Input className="mt-1" value={v.tagline} onChange={(e) => set("tagline", e.target.value)} /></div>
      </div>
      <div><Label>Description</Label><Textarea className="mt-1" rows={3} value={v.description} onChange={(e) => set("description", e.target.value)} /></div>
      <div><Label>Positioning statement</Label><Textarea className="mt-1" rows={2} value={v.positioning} onChange={(e) => set("positioning", e.target.value)} /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <StringListInput label="Value propositions" value={v.valueProps} onChange={(x) => set("valueProps", x)} placeholder="e.g. See results the same day" />
        <StringListInput label="Key messages" value={v.keyMessages} onChange={(x) => set("keyMessages", x)} />
        <StringListInput label="Differentiators" value={v.differentiators} onChange={(x) => set("differentiators", x)} placeholder="What sets you apart" />
        <StringListInput label="Marketing objectives" value={v.objectives} onChange={(x) => set("objectives", x)} />
        <StringListInput label="Audience priorities" value={v.audiencePriorities} onChange={(x) => set("audiencePriorities", x)} />
        <StringListInput label="Target markets" value={v.markets} onChange={(x) => set("markets", x)} placeholder="e.g. United Kingdom" />
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <Save />} Save</Button>
        {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
      </div>
    </div>
  );
}
