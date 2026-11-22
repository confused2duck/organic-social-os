"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markRepliedAction, ignoreMessageAction } from "@/app/actions/community";

export function InboxButtons({ messageId, status }: { messageId: string; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (status === "replied" || status === "ignored") return null;
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="success" disabled={pending} onClick={() => start(async () => { await markRepliedAction(messageId); router.refresh(); })}>
        <Check /> Mark replied
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => start(async () => { await ignoreMessageAction(messageId); router.refresh(); })}>
        <X /> Ignore
      </Button>
    </div>
  );
}
