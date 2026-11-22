"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Play, RefreshCw, ListPlus, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runWorkflowAction, enqueueWorkflowAction, enqueueAutonomousCycleAction } from "@/app/actions/workflow";

type Step = "full" | "research" | "strategy" | "calendar" | "creative" | "community" | "report";

export function RunWorkflowButton({
  step = "full",
  label,
  variant = "default",
  size = "default",
}: {
  step?: Step;
  label?: string;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function run() {
    setMsg(null);
    start(async () => {
      const res = await runWorkflowAction(step);
      if (res.ok) {
        setMsg("Done");
        router.refresh();
      } else {
        setMsg(res.error ?? "Failed");
      }
    });
  }

  return (
    <div className="inline-flex items-center gap-2">
      <Button onClick={run} disabled={pending} variant={variant} size={size}>
        {pending ? <Loader2 className="animate-spin" /> : step === "full" ? <Play /> : <RefreshCw />}
        {label ?? (step === "full" ? "Run full cycle" : `Run ${step}`)}
      </Button>
      {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
    </div>
  );
}

/** Enqueue the full autonomous (AI + accuracy gate) cycle for the worker. */
export function AutonomousCycleButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="inline-flex items-center gap-2">
      <Button size="sm" disabled={pending} onClick={() => start(async () => { const r = await enqueueAutonomousCycleAction(); setMsg(r.ok ? "Queued — the worker runs it with AI + validation" : "Failed"); router.refresh(); })}>
        {pending ? <Loader2 className="animate-spin" /> : <Bot />} Queue autonomous cycle
      </Button>
      {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
    </div>
  );
}

/** Enqueue a task for the durable worker instead of running inline. */
export function EnqueueButton({ step = "full", label }: { step?: Step; label?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="inline-flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => start(async () => { const r = await enqueueWorkflowAction(step); setMsg(r.ok ? "Queued — the worker will process it" : "Failed"); router.refresh(); })}
      >
        {pending ? <Loader2 className="animate-spin" /> : <ListPlus />} {label ?? "Queue for worker"}
      </Button>
      {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
    </div>
  );
}
