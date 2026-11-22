// Ollama provider adapter — a locally-hosted, open-weight inference runtime.
// Server-side only. No paid API, no personal subscription credentials.
// Everything here is defensive: a failure returns null so callers fall back to
// deterministic generation (and label outputs honestly).

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GenOptions {
  model?: string;
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface GenResult {
  text: string;
  model: string;
  tokens: number;
  durationMs: number;
}

const BASE_URL = process.env.OLLAMA_URL || "http://localhost:11434";
export const DEFAULT_MODEL = process.env.OLLAMA_MODEL || "qwen3:8b";
export const FAST_MODEL = process.env.OLLAMA_FAST_MODEL || "llama3.2:1b";
const DEFAULT_TIMEOUT = Number(process.env.AI_TIMEOUT_MS || 180_000);

async function withTimeout<T>(p: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await p(ctrl.signal);
  } finally {
    clearTimeout(t);
  }
}

/** Is the Ollama server reachable? */
export async function ollamaReachable(timeoutMs = 4000): Promise<boolean> {
  try {
    return await withTimeout(async (signal) => {
      const res = await fetch(`${BASE_URL}/api/tags`, { signal });
      return res.ok;
    }, timeoutMs);
  } catch {
    return false;
  }
}

/** List locally-available model names. */
export async function ollamaModels(timeoutMs = 4000): Promise<string[]> {
  try {
    return await withTimeout(async (signal) => {
      const res = await fetch(`${BASE_URL}/api/tags`, { signal });
      if (!res.ok) return [];
      const data = (await res.json()) as { models?: { name: string }[] };
      return (data.models ?? []).map((m) => m.name);
    }, timeoutMs);
  } catch {
    return [];
  }
}

/**
 * Run a chat completion. Returns null on any failure (unreachable, timeout,
 * bad response) so the caller can fall back deterministically.
 */
export async function ollamaChat(messages: ChatMessage[], opts: GenOptions = {}): Promise<GenResult | null> {
  const model = opts.model || DEFAULT_MODEL;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT;
  const body = {
    model,
    messages,
    stream: false,
    // qwen3 is a hybrid "thinking" model; disable thinking for fast structured output.
    think: false,
    ...(opts.json ? { format: "json" as const } : {}),
    options: {
      temperature: opts.temperature ?? 0.4,
      num_predict: opts.maxTokens ?? 512,
    },
  };
  try {
    return await withTimeout(async (signal) => {
      const started = Date.now();
      const res = await fetch(`${BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { message?: { content?: string }; eval_count?: number };
      const text = data.message?.content?.trim();
      if (!text) return null;
      return { text, model, tokens: data.eval_count ?? 0, durationMs: Date.now() - started };
    }, timeoutMs);
  } catch {
    return null;
  }
}
