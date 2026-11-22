"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { updatePostAction } from "@/app/actions/content";

export function PostEditor({
  postId,
  initial,
}: {
  postId: string;
  initial: { topic: string; mainMessage: string; caption: string; hashtags: string[] };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [topic, setTopic] = useState(initial.topic);
  const [mainMessage, setMainMessage] = useState(initial.mainMessage);
  const [caption, setCaption] = useState(initial.caption);
  const [hashtags, setHashtags] = useState(initial.hashtags.join(" "));
  const [msg, setMsg] = useState<string | null>(null);

  function save() {
    setMsg(null);
    start(async () => {
      const res = await updatePostAction(postId, {
        topic,
        mainMessage,
        caption,
        hashtags: hashtags.split(/\s+/).filter(Boolean),
      });
      setMsg(res.ok ? "Saved" : res.error ?? "Failed");
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="topic">Topic</Label>
        <Input id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} className="mt-1" />
      </div>
      <div>
        <Label htmlFor="msg">Main message</Label>
        <Input id="msg" value={mainMessage} onChange={(e) => setMainMessage(e.target.value)} className="mt-1" />
      </div>
      <div>
        <Label htmlFor="caption">Caption</Label>
        <Textarea id="caption" value={caption} onChange={(e) => setCaption(e.target.value)} rows={6} className="mt-1" />
      </div>
      <div>
        <Label htmlFor="tags">Hashtags (space-separated)</Label>
        <Input id="tags" value={hashtags} onChange={(e) => setHashtags(e.target.value)} className="mt-1" />
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />} Save changes
        </Button>
        {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
      </div>
    </div>
  );
}
