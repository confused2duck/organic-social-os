"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { renderCreativeAction, renderAllAction } from "@/app/actions/creative";

export function RenderButton({ creativeId, label = "Render" }: { creativeId: string; label?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="inline-flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => start(async () => { const r = await renderCreativeAction(creativeId); setMsg(r.result.capabilityState); router.refresh(); })}
      >
        {pending ? <Loader2 className="animate-spin" /> : <ImageIcon />} {label}
      </Button>
      {msg && <span className="text-xs text-muted-foreground">{msg.replace(/_/g, " ")}</span>}
    </div>
  );
}

export function RenderAllButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="inline-flex items-center gap-2">
      <Button
        size="sm"
        disabled={pending}
        onClick={() => start(async () => { const r = await renderAllAction(); setMsg(`rendered ${r.result.rendered}, awaiting ${r.result.awaiting}`); router.refresh(); })}
      >
        {pending ? <Loader2 className="animate-spin" /> : <ImageIcon />} Render all
      </Button>
      {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
    </div>
  );
}
