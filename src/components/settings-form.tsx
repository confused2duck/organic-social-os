"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PLATFORMS, PLATFORM_LABELS, CONTENT_FORMATS, WEEKDAYS, type Platform } from "@/lib/enums";
import { saveConfigAction } from "@/app/actions/settings";

export interface SettingsValue {
  platforms: string[];
  postsPerDay: Record<string, number>;
  publishingDays: number[];
  preferredTimes: Record<string, string[]>;
  contentFormats: string[];
  timezone: string;
  approvalRequired: boolean;
  autopublish: boolean;
  weeklyReportDay: number;
  weeklyReportTime: string;
  reportRecipients: string[];
}

export function SettingsForm({ initial }: { initial: SettingsValue }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [v, setV] = useState<SettingsValue>(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [recipients, setRecipients] = useState(initial.reportRecipients.join(", "));

  const weeklySlots = useMemo(
    () => v.platforms.reduce((sum, p) => sum + (v.postsPerDay[p] ?? 0) * v.publishingDays.length, 0),
    [v],
  );

  function togglePlatform(p: string) {
    setV((s) => {
      const has = s.platforms.includes(p);
      const platforms = has ? s.platforms.filter((x) => x !== p) : [...s.platforms, p];
      const postsPerDay = { ...s.postsPerDay };
      if (!has && postsPerDay[p] == null) postsPerDay[p] = 1;
      return { ...s, platforms, postsPerDay };
    });
  }
  function toggleDay(d: number) {
    setV((s) => ({ ...s, publishingDays: s.publishingDays.includes(d) ? s.publishingDays.filter((x) => x !== d) : [...s.publishingDays, d].sort() }));
  }
  function toggleFormat(f: string) {
    setV((s) => ({ ...s, contentFormats: s.contentFormats.includes(f) ? s.contentFormats.filter((x) => x !== f) : [...s.contentFormats, f] }));
  }

  function save() {
    setMsg(null);
    start(async () => {
      const res = await saveConfigAction({
        ...v,
        platforms: v.platforms as Platform[],
        contentFormats: v.contentFormats as never,
        reportRecipients: recipients.split(",").map((s) => s.trim()).filter(Boolean),
      });
      setMsg(res.ok ? "Settings saved — future schedules will use these." : res.error ?? "Failed");
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-center justify-between gap-4 p-4">
          <div>
            <p className="text-sm text-muted-foreground">Computed weekly publishing slots</p>
            <p className="text-2xl font-semibold">{weeklySlots}</p>
            <p className="text-xs text-muted-foreground">{v.platforms.length} platforms × {v.publishingDays.length} days — regenerating the calendar uses this.</p>
          </div>
          <Button onClick={save} disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : <Save />} Save settings</Button>
        </CardContent>
      </Card>
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}

      <Card>
        <CardHeader><CardTitle className="text-base">Platforms & frequency</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {PLATFORMS.map((p) => {
            const on = v.platforms.includes(p);
            return (
              <div key={p} className="flex items-center gap-3">
                <Checkbox checked={on} onCheckedChange={() => togglePlatform(p)} id={`p-${p}`} />
                <Label htmlFor={`p-${p}`} className="w-28">{PLATFORM_LABELS[p]}</Label>
                {on && (
                  <div className="flex items-center gap-2">
                    <Input type="number" min={0} max={20} value={v.postsPerDay[p] ?? 0}
                      onChange={(e) => setV((s) => ({ ...s, postsPerDay: { ...s.postsPerDay, [p]: Math.max(0, parseInt(e.target.value || "0", 10)) } }))}
                      className="w-20" />
                    <span className="text-sm text-muted-foreground">posts/day</span>
                    <Input value={(v.preferredTimes[p] ?? []).join(", ")} placeholder="09:00, 13:00"
                      onChange={(e) => setV((s) => ({ ...s, preferredTimes: { ...s.preferredTimes, [p]: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) } }))}
                      className="w-40" />
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Publishing days</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {WEEKDAYS.map((label, d) => (
              <button key={d} type="button" onClick={() => toggleDay(d)}
                className={`rounded-md border px-3 py-1.5 text-sm ${v.publishingDays.includes(d) ? "border-primary bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>
                {label}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Content formats</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {CONTENT_FORMATS.map((f) => (
              <button key={f} type="button" onClick={() => toggleFormat(f)}
                className={`rounded-md border px-3 py-1.5 text-sm capitalize ${v.contentFormats.includes(f) ? "border-primary bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>
                {f}
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Autonomy & approvals</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Require approval before scheduling</Label>
              <Switch checked={v.approvalRequired} onCheckedChange={(c) => setV((s) => ({ ...s, approvalRequired: c }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Auto-publish approved posts</Label>
              <Switch checked={v.autopublish} onCheckedChange={(c) => setV((s) => ({ ...s, autopublish: c }))} />
            </div>
            <div>
              <Label htmlFor="tz">Time zone</Label>
              <Input id="tz" value={v.timezone} onChange={(e) => setV((s) => ({ ...s, timezone: e.target.value }))} className="mt-1" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Weekly report delivery</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <Label>Day</Label>
                <select value={v.weeklyReportDay} onChange={(e) => setV((s) => ({ ...s, weeklyReportDay: parseInt(e.target.value, 10) }))}
                  className="mt-1 h-9 w-full rounded-md border border-input bg-card px-2 text-sm">
                  {WEEKDAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <Label htmlFor="rt">Time</Label>
                <Input id="rt" value={v.weeklyReportTime} onChange={(e) => setV((s) => ({ ...s, weeklyReportTime: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label htmlFor="rec">Recipients (comma-separated)</Label>
              <Input id="rec" value={recipients} onChange={(e) => setRecipients(e.target.value)} placeholder="ops@company.com" className="mt-1" />
              <p className="mt-1 text-xs text-muted-foreground">Delivery runs only with authorised SMTP configured; results are recorded truthfully.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
