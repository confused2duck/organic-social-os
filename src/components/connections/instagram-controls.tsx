"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Instagram, RefreshCw, Unlink, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  connectTestInstagramAction,
  refreshInstagramAction,
  disconnectInstagramAction,
} from "@/app/actions/instagram";

export function InstagramControls({
  connected,
  testToken,
  oauth,
}: {
  connected: boolean;
  testToken: boolean;
  oauth: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string; username?: string }>, okMsg: (u?: string) => string) => {
    setMsg(null);
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? okMsg(r.username) : r.error ?? "Failed");
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {!connected && testToken && (
          <Button
            size="sm"
            disabled={pending}
            onClick={() => run(connectTestInstagramAction, (u) => `Verified @${u}`)}
          >
            {pending ? <Loader2 className="animate-spin" /> : <ShieldCheck />} Verify &amp; connect test account
          </Button>
        )}
        {!connected && oauth && (
          <Button asChild size="sm" variant={testToken ? "outline" : "default"}>
            <a href="/api/oauth/instagram/start">
              <Instagram /> Connect with Instagram
            </a>
          </Button>
        )}
        {connected && (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => run(refreshInstagramAction, (u) => `Refreshed @${u}`)}
            >
              {pending ? <Loader2 className="animate-spin" /> : <RefreshCw />} Refresh live data
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => run(async () => disconnectInstagramAction(), () => "Disconnected")}
            >
              <Unlink /> Disconnect
            </Button>
          </>
        )}
      </div>
      {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
      {!connected && !testToken && !oauth && (
        <span className="text-xs text-muted-foreground">
          Set Instagram credentials in the environment to enable a genuine connection.
        </span>
      )}
    </div>
  );
}
