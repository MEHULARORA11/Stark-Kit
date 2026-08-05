// src/provider/provider.ts
import type { IToolOptions } from "../types/tools.js";
import type { CanonicalMessage, ToolCall } from "../types/message.js";

export interface AIResponse {
  content: string | null;
  toolCalls?: ToolCall[];
}

/**
 * Generic generation knobs. Every provider maps whichever of these it
 * supports onto its own SDK params. run() never needs to know which
 * provider is underneath to pass these through.
 */
export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

// ── Streaming Chunk ───────────────────────────────────────────────────
/**
 * Provider-agnostic streaming chunk. Every provider's `chatStream`
 * implementation normalizes its native delta events into this shape.
 */
export type StreamChunk =
  | { type: "text"; delta: string }
  | { type: "tool_call"; id: string; name: string; argsDelta: string }
  | { type: "tool_call_done"; id: string; name: string; args: unknown }
  | { type: "done"; response: AIResponse };

// ── Provider Interface ────────────────────────────────────────────────
export interface Provider {
  name: string;

  /**
   * Takes the canonical, provider-agnostic history + tool defs, and
   * returns a canonical AIResponse. All translation to/from the
   * underlying SDK's native message/tool format must happen INSIDE
   * this method (typically delegated to a private Mapper) -- it must
   * never leak native shapes back out into `history`.
   */
  chat(
    history: CanonicalMessage[],
    tools: IToolOptions[],
    options?: ChatOptions
  ): Promise<AIResponse>;

  /**
   * Streaming variant of `chat`. Yields provider-agnostic `StreamChunk`
   * objects as they arrive from the underlying API. The final chunk is
   * always `{ type: "done", response }` carrying the assembled AIResponse.
   *
   * Optional — providers that don't support streaming can omit this,
   * and `runStream` will fall back to `chat()`.
   */
  chatStream?(
    history: CanonicalMessage[],
    tools: IToolOptions[],
    options?: ChatOptions
  ): AsyncGenerator<StreamChunk, void, unknown>;
}