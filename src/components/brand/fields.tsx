"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Editable list of short strings, rendered as removable chips. */
export function StringListInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  function add() {
    const v = draft.trim();
    if (!v) return;
    onChange([...value, v]);
    setDraft("");
  }
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {value.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs">
            {item}
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive" aria-label={`Remove ${item}`}>
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-1.5 flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder ?? "Type and press Enter"}
          className="h-8"
        />
        <button type="button" onClick={add} className="flex size-8 shrink-0 items-center justify-center rounded-md border hover:bg-secondary" aria-label="Add">
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}
