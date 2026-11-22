"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { StringListInput } from "./fields";
import {
  addProductAction, deleteProductAction,
  addIcpAction, deleteIcpAction,
  addPersonaAction, deletePersonaAction,
  addCompetitorAction, deleteCompetitorAction,
} from "@/app/actions/brand";

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) => {
    setError(null);
    start(async () => {
      const r = await fn();
      if (r.ok) { after?.(); router.refresh(); } else setError(r.error ?? "Failed");
    });
  };
  return { pending, error, run };
}

function Row({ children, onDelete, pending }: { children: React.ReactNode; onDelete: () => void; pending: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
      <div className="min-w-0 flex-1">{children}</div>
      <button onClick={onDelete} disabled={pending} className="shrink-0 text-muted-foreground hover:text-destructive" aria-label="Delete">
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

// --------------------------- Products ---------------------------
export function ProductsEditor({ items }: { items: { id: string; name: string; category: string | null; description: string | null; features: string[] }[] }) {
  const { pending, error, run } = useAction();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<"product" | "service">("product");
  const [description, setDescription] = useState("");
  const [features, setFeatures] = useState<string[]>([]);
  return (
    <div className="space-y-3">
      {items.map((p) => (
        <Row key={p.id} pending={pending} onDelete={() => run(() => deleteProductAction(p.id))}>
          <div className="flex items-center gap-2"><span className="font-medium">{p.name}</span><Badge tone="muted">{p.category}</Badge></div>
          {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
          <div className="mt-1 flex flex-wrap gap-1">{p.features.map((f) => <Badge key={f} tone="outline">{f}</Badge>)}</div>
        </Row>
      ))}
      <div className="space-y-3 rounded-lg border border-dashed p-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="Product / service name" value={name} onChange={(e) => setName(e.target.value)} />
          <select value={category} onChange={(e) => setCategory(e.target.value as "product" | "service")} className="h-9 rounded-md border border-input bg-card px-2 text-sm">
            <option value="product">Product</option><option value="service">Service</option>
          </select>
        </div>
        <Textarea placeholder="Short description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        <StringListInput label="Key features" value={features} onChange={setFeatures} />
        <Button size="sm" disabled={pending || !name} onClick={() => run(() => addProductAction({ name, category, description, features }), () => { setName(""); setDescription(""); setFeatures([]); })}>
          {pending ? <Loader2 className="animate-spin" /> : <Plus />} Add product/service
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}

// --------------------------- ICP profiles ---------------------------
export function IcpEditor({ items }: { items: { id: string; name: string; summary: string | null; firmographics: string[]; triggers: string[]; segments: string[]; priority: number }[] }) {
  const { pending, error, run } = useAction();
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [firmographics, setFirmographics] = useState<string[]>([]);
  const [triggers, setTriggers] = useState<string[]>([]);
  const [segments, setSegments] = useState<string[]>([]);
  return (
    <div className="space-y-3">
      {items.map((p) => (
        <Row key={p.id} pending={pending} onDelete={() => run(() => deleteIcpAction(p.id))}>
          <div className="flex items-center gap-2"><span className="font-medium">{p.name}</span><Badge tone="muted">priority {p.priority}</Badge></div>
          {p.summary && <p className="text-sm text-muted-foreground">{p.summary}</p>}
          <div className="mt-1 flex flex-wrap gap-1">{p.segments.map((s) => <Badge key={s} tone="outline">{s}</Badge>)}</div>
        </Row>
      ))}
      <div className="space-y-3 rounded-lg border border-dashed p-3">
        <Input placeholder="ICP name (e.g. Mid-market ops leaders)" value={name} onChange={(e) => setName(e.target.value)} />
        <Textarea placeholder="Summary" rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} />
        <div className="grid gap-3 sm:grid-cols-3">
          <StringListInput label="Firmographics" value={firmographics} onChange={setFirmographics} />
          <StringListInput label="Buying triggers" value={triggers} onChange={setTriggers} />
          <StringListInput label="Segments" value={segments} onChange={setSegments} />
        </div>
        <Button size="sm" disabled={pending || !name} onClick={() => run(() => addIcpAction({ name, summary, firmographics, triggers, segments, priority: items.length + 1 }), () => { setName(""); setSummary(""); setFirmographics([]); setTriggers([]); setSegments([]); })}>
          {pending ? <Loader2 className="animate-spin" /> : <Plus />} Add ICP
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}

// --------------------------- Personas ---------------------------
export function PersonasEditor({ items }: { items: { id: string; name: string; role: string | null; description: string | null; goals: string[]; painPoints: string[]; buyingMotivations: string[]; channels: string[] }[] }) {
  const { pending, error, run } = useAction();
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [description, setDescription] = useState("");
  const [goals, setGoals] = useState<string[]>([]);
  const [painPoints, setPainPoints] = useState<string[]>([]);
  const [buyingMotivations, setBuyingMotivations] = useState<string[]>([]);
  const [channels, setChannels] = useState<string[]>([]);
  return (
    <div className="space-y-3">
      {items.map((p) => (
        <Row key={p.id} pending={pending} onDelete={() => run(() => deletePersonaAction(p.id))}>
          <div className="flex items-center gap-2"><span className="font-medium">{p.name}</span>{p.role && <Badge tone="muted">{p.role}</Badge>}</div>
          {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
          <p className="mt-1 text-xs text-muted-foreground">Motivations: {p.buyingMotivations.join(", ") || "—"}</p>
        </Row>
      ))}
      <div className="space-y-3 rounded-lg border border-dashed p-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="Persona name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Role / title" value={role} onChange={(e) => setRole(e.target.value)} />
        </div>
        <Textarea placeholder="Description" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="grid gap-3 sm:grid-cols-2">
          <StringListInput label="Goals / objectives" value={goals} onChange={setGoals} />
          <StringListInput label="Pain points" value={painPoints} onChange={setPainPoints} />
          <StringListInput label="Buying motivations" value={buyingMotivations} onChange={setBuyingMotivations} />
          <StringListInput label="Channels" value={channels} onChange={setChannels} />
        </div>
        <Button size="sm" disabled={pending || !name} onClick={() => run(() => addPersonaAction({ name, role, description, goals, painPoints, buyingMotivations, channels }), () => { setName(""); setRole(""); setDescription(""); setGoals([]); setPainPoints([]); setBuyingMotivations([]); setChannels([]); })}>
          {pending ? <Loader2 className="animate-spin" /> : <Plus />} Add persona
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}

// --------------------------- Competitors ---------------------------
export function CompetitorsEditor({ items }: { items: { id: string; name: string; website: string | null; handles: Record<string, string>; strengths: string[]; weaknesses: string[] }[] }) {
  const { pending, error, run } = useAction();
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [instagram, setInstagram] = useState("");
  const [strengths, setStrengths] = useState<string[]>([]);
  const [weaknesses, setWeaknesses] = useState<string[]>([]);
  return (
    <div className="space-y-3">
      {items.map((c) => (
        <Row key={c.id} pending={pending} onDelete={() => run(() => deleteCompetitorAction(c.id))}>
          <div className="flex items-center gap-2"><span className="font-medium">{c.name}</span>{c.website && <a href={c.website} className="text-xs text-primary hover:underline">site</a>}</div>
          <p className="text-xs text-muted-foreground">{Object.entries(c.handles).map(([k, v]) => `${k}: @${v}`).join(" · ") || "no social handles"}</p>
          <p className="mt-1 text-xs">Openings: {c.weaknesses.join(", ") || "—"}</p>
        </Row>
      ))}
      <div className="space-y-3 rounded-lg border border-dashed p-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="Competitor name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Website" value={website} onChange={(e) => setWebsite(e.target.value)} />
          <Input placeholder="LinkedIn handle" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} />
          <Input placeholder="Instagram handle" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <StringListInput label="Strengths" value={strengths} onChange={setStrengths} />
          <StringListInput label="Weaknesses / openings" value={weaknesses} onChange={setWeaknesses} />
        </div>
        <Button size="sm" disabled={pending || !name} onClick={() => run(() => addCompetitorAction({ name, website, handles: { ...(linkedin ? { LINKEDIN: linkedin } : {}), ...(instagram ? { INSTAGRAM: instagram } : {}) }, strengths, weaknesses }), () => { setName(""); setWebsite(""); setLinkedin(""); setInstagram(""); setStrengths([]); setWeaknesses([]); })}>
          {pending ? <Loader2 className="animate-spin" /> : <Plus />} Add competitor
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
