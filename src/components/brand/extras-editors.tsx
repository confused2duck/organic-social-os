"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Trash2, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { StringListInput } from "./fields";
import { updateVoiceAction, updateVisualAction, addClaimAction, deleteClaimAction, addDocumentAction, deleteDocumentAction } from "@/app/actions/brand";

function useAction() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string, after?: () => void) => {
    setMsg(null);
    start(async () => { const r = await fn(); if (r.ok) { setMsg(okMsg); after?.(); router.refresh(); } else setMsg(r.error ?? "Failed"); });
  };
  return { pending, msg, run };
}

// --------------------------- Brand voice ---------------------------
export function VoiceEditor({ initial }: { initial: { tone: string[]; doList: string[]; dontList: string[]; writingGuidelines: string } }) {
  const { pending, msg, run } = useAction();
  const [v, setV] = useState(initial);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StringListInput label="Tone" value={v.tone} onChange={(x) => setV((s) => ({ ...s, tone: x }))} placeholder="e.g. Plain-spoken" />
        <StringListInput label="Do" value={v.doList} onChange={(x) => setV((s) => ({ ...s, doList: x }))} />
        <StringListInput label="Don't" value={v.dontList} onChange={(x) => setV((s) => ({ ...s, dontList: x }))} />
      </div>
      <div><Label>Writing guidelines</Label><Textarea className="mt-1" rows={3} value={v.writingGuidelines} onChange={(e) => setV((s) => ({ ...s, writingGuidelines: e.target.value }))} /></div>
      <div className="flex items-center gap-3">
        <Button onClick={() => run(() => updateVoiceAction(v), "Saved")} disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <Save />} Save voice</Button>
        {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
      </div>
    </div>
  );
}

// --------------------------- Visual brand ---------------------------
const COLOR_KEYS = [["primary", "Primary"], ["secondary", "Secondary"], ["accent", "Accent"], ["neutralDark", "Neutral dark"], ["neutralLight", "Neutral light"]] as const;
export function VisualEditor({ initial }: { initial: { colors: Record<string, string>; fonts: { heading: string; body: string }; logoUrl: string } }) {
  const { pending, msg, run } = useAction();
  const [colors, setColors] = useState<Record<string, string>>(initial.colors);
  const [fonts, setFonts] = useState(initial.fonts);
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-5">
        {COLOR_KEYS.map(([k, label]) => (
          <div key={k}>
            <Label>{label}</Label>
            <div className="mt-1 flex items-center gap-2">
              <input type="color" value={colors[k] ?? "#000000"} onChange={(e) => setColors((s) => ({ ...s, [k]: e.target.value }))} className="size-9 rounded border" />
              <Input value={colors[k] ?? ""} onChange={(e) => setColors((s) => ({ ...s, [k]: e.target.value }))} className="h-9" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div><Label>Heading font</Label><Input className="mt-1" value={fonts.heading} onChange={(e) => setFonts((s) => ({ ...s, heading: e.target.value }))} /></div>
        <div><Label>Body font</Label><Input className="mt-1" value={fonts.body} onChange={(e) => setFonts((s) => ({ ...s, body: e.target.value }))} /></div>
        <div><Label>Logo URL</Label><Input className="mt-1" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="/path or https://…" /></div>
      </div>
      <p className="text-xs text-muted-foreground">These colours and fonts are used directly when rendering branded graphics, carousels and video.</p>
      <div className="flex items-center gap-3">
        <Button onClick={() => run(() => updateVisualAction({ colors: colors as never, fonts, logoUrl }), "Saved")} disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <Save />} Save visual brand</Button>
        {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
      </div>
    </div>
  );
}

// --------------------------- Claims / restrictions ---------------------------
export function ClaimsEditor({ items }: { items: { id: string; kind: string; text: string; rationale: string | null }[] }) {
  const { pending, msg, run } = useAction();
  const [kind, setKind] = useState<"approved" | "prohibited">("approved");
  const [text, setText] = useState("");
  const [rationale, setRationale] = useState("");
  return (
    <div className="space-y-3">
      {items.map((c) => (
        <div key={c.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
          <div className="flex items-start gap-2"><Badge tone={c.kind === "approved" ? "success" : "danger"}>{c.kind}</Badge><div><p className="text-sm">{c.text}</p>{c.rationale && <p className="text-xs text-muted-foreground">{c.rationale}</p>}</div></div>
          <button onClick={() => run(() => deleteClaimAction(c.id), "Removed")} disabled={pending} className="text-muted-foreground hover:text-destructive" aria-label="Delete"><Trash2 className="size-4" /></button>
        </div>
      ))}
      <div className="space-y-3 rounded-lg border border-dashed p-3">
        <div className="flex gap-3">
          <select value={kind} onChange={(e) => setKind(e.target.value as "approved" | "prohibited")} className="h-9 rounded-md border border-input bg-card px-2 text-sm">
            <option value="approved">Approved claim</option><option value="prohibited">Prohibited / restriction</option>
          </select>
          <Input placeholder="Claim or restriction text" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        <Input placeholder="Rationale (optional)" value={rationale} onChange={(e) => setRationale(e.target.value)} />
        <Button size="sm" disabled={pending || !text} onClick={() => run(() => addClaimAction({ kind, text, rationale }), "Added", () => { setText(""); setRationale(""); })}>
          {pending ? <Loader2 className="animate-spin" /> : <Plus />} Add
        </Button>
        {msg && <span className="ml-2 text-sm text-muted-foreground">{msg}</span>}
      </div>
    </div>
  );
}

// --------------------------- Documents + extracted knowledge ---------------------------
export function DocumentsEditor({ documents }: { documents: { id: string; name: string; kind: string; processed: boolean; content: string | null; knowledge: { id: string; category: string; text: string }[] }[] }) {
  const { pending, msg, run } = useAction();
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-lg border border-dashed p-4">
        <p className="text-sm font-medium">Add a document / knowledge source</p>
        <Input placeholder="Document name (e.g. Brand guidelines)" value={name} onChange={(e) => setName(e.target.value)} />
        <Textarea placeholder="Paste brand knowledge, guidelines, website copy… It is processed into traceable knowledge statements (nothing is invented)." rows={5} value={content} onChange={(e) => setContent(e.target.value)} />
        <Button size="sm" disabled={pending || !name || !content} onClick={() => run(() => addDocumentAction({ name, content, kind: "note" }), "Processed", () => { setName(""); setContent(""); })}>
          {pending ? <Loader2 className="animate-spin" /> : <Plus />} Add & process
        </Button>
        {msg && <span className="ml-2 text-sm text-muted-foreground">{msg}</span>}
      </div>
      <div className="space-y-3">
        {documents.length === 0 && <p className="text-sm text-muted-foreground">No documents yet.</p>}
        {documents.map((d) => (
          <div key={d.id} className="rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">{d.name}</span>
              <div className="flex items-center gap-2">
                <Badge tone={d.processed ? "success" : "muted"}>{d.processed ? `${d.knowledge.length} knowledge items` : "unprocessed"}</Badge>
                <button onClick={() => run(() => deleteDocumentAction(d.id), "Removed")} disabled={pending} className="text-muted-foreground hover:text-destructive" aria-label="Delete"><Trash2 className="size-4" /></button>
              </div>
            </div>
            {d.knowledge.length > 0 && (
              <ul className="mt-2 space-y-1 border-t pt-2 text-xs">
                {d.knowledge.slice(0, 8).map((k) => (
                  <li key={k.id} className="flex gap-2"><Badge tone="outline">{k.category}</Badge><span>{k.text}</span></li>
                ))}
                {d.knowledge.length > 8 && <li className="text-muted-foreground">+{d.knowledge.length - 8} more…</li>}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
