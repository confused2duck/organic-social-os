"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { queuePublishAction, submitForApprovalAction } from "@/app/actions/content";

export function PublishButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function publish() {
    setMsg(null);
    start(async () => {
      const res = await queuePublishAction(postId);
      setMsg(res.ok ? `Status: ${res.status}` : `Blocked: ${res.reason}`);
      router.refresh();
    });
  }

  return (
    <div className="inline-flex items-center gap-2">
      <Button onClick={publish} disabled={pending} variant="outline" size="sm">
        {pending ? <Loader2 className="animate-spin" /> : <Send />} Queue publish
      </Button>
      {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
    </div>
  );
}

export function SubmitForApprovalButton({ postId }: { postId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={pending}
      onClick={() => start(async () => { await submitForApprovalAction(postId); router.refresh(); })}
    >
      Submit for approval
    </Button>
  );
}
