// Reusable server-side inference interface. Provider-agnostic; today it is
// backed by a locally-hosted Ollama runtime (open-weight models). Swapping in a
// future production runtime means implementing the same three functions.
//
// Honesty contract: when inference is unavailable, these return { ok: false }
// and callers MUST fall back to deterministic generation and label it as such.
// AI outputs are labelled `ai:<model>`; nothing is presented as AI unless a model
// actually produced it.

import { ollamaReachable, ollamaModels, ollamaChat, DEFAULT_MODEL, FAST_MODEL, type ChatMessage, type GenOptions } from "./ollama";

export interface AiStatus {
  available: boolean;
  provider: "ollama" | "none";
  model: string | null;
  fastModel: string | null;
  models: string[];
  reason: string;
}

let cached: { status: AiStatus; at: number } | null = null;
const STATUS_TTL = 15_000;

/** Detect whether a real inference runtime is available (cached briefly). */
export async function getAiStatus(force = false): Promise<AiStatus> {
  if (!force && cached && Date.now() - cached.at < STATUS_TTL) return cached.status;
  const reachable = await ollamaReachable();
  let status: AiStatus;
  if (!reachable) {
    status = { available: false, provider: "none", model: null, fastModel: null, models: [], reason: "Ollama runtime not reachable on " + (process.env.OLLAMA_URL || "http://localhost:11434") };
  } else {
    const models = await ollamaModels();
    const model = models.includes(DEFAULT_MODEL) ? DEFAULT_MODEL : models[0] ?? null;
    const fastModel = models.includes(FAST_MODEL) ? FAST_MODEL : model;
    status = {
      available: Boolean(model),
      provider: "ollama",
      model,
      fastModel,
      models,
      reason: model ? `Ollama runtime available; default model ${model}` : "Ollama reachable but no models installed",
    };
  }
  cached = { status, at: Date.now() };
  return status;
}

export type AiResult<T> = { ok: true; data: T; model: string; durationMs: number; tokens: number } | { ok: false; reason: string };

/** Label for honest attribution (e.g. "ai:qwen3:8b"). */
export function aiLabel(model: string): string {
  return `ai:${model}`;
}

/** Generate free text. Returns { ok:false } if no runtime — caller falls back. */
export async function aiText(system: string, user: string, opts: GenOptions = {}): Promise<AiResult<string>> {
  const status = await getAiStatus();
  if (!status.available || !status.model) return { ok: false, reason: status.reason };
  const messages: ChatMessage[] = [{ role: "system", content: system }, { role: "user", content: user }];
  const res = await ollamaChat(messages, { ...opts, model: opts.model ?? status.model });
  if (!res) return { ok: false, reason: "inference call failed or timed out" };
  return { ok: true, data: res.text, model: res.model, durationMs: res.durationMs, tokens: res.tokens };
}

/**
 * Generate structured JSON and parse it. The model is asked for JSON and the
 * output is parsed defensively (strips code fences / preamble). Returns
 * { ok:false } on any failure so the caller falls back deterministically.
 */
export async function aiJson<T>(system: string, user: string, opts: GenOptions = {}): Promise<AiResult<T>> {
  const status = await getAiStatus();
  if (!status.available || !status.model) return { ok: false, reason: status.reason };
  const messages: ChatMessage[] = [{ role: "system", content: system }, { role: "user", content: user }];
  const res = await ollamaChat(messages, { ...opts, json: true, model: opts.model ?? status.model });
  if (!res) return { ok: false, reason: "inference call failed or timed out" };
  const parsed = safeParseJson<T>(res.text);
  if (parsed === null) return { ok: false, reason: "model output was not valid JSON" };
  return { ok: true, data: parsed, model: res.model, durationMs: res.durationMs, tokens: res.tokens };
}

function safeParseJson<T>(text: string): T | null {
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Try to extract the first {...} or [...] block.
    const m = cleaned.match(/[{[][\s\S]*[}\]]/);
    if (m) {
      try {
        return JSON.parse(m[0]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}
