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
}