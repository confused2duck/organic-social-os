"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { approvePostAction, rejectPostAction } from "@/app/actions/content";

export function ApprovalButtons({ postId }: { postId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function decide(kind: "approve" | "reject") {
    start(async () => {
      if (kind === "approve") await approvePostAction(postId);
      else await rejectPostAction(postId);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="success" disabled={pending} onClick={() => decide("approve")}>
        {pending ? <Loader2 className="animate-spin" /> : <Check />} Approve
      </Button>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => decide("reject")}>
        <X /> Reject
      </Button>
    </div>
  );
}
