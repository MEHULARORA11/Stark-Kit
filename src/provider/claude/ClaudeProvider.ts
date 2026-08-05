import Anthropic from "@anthropic-ai/sdk";
import type { Provider, AIResponse, ChatOptions } from "../provider.js";
import type { IToolOptions } from "../../types/tools.js";
import type { CanonicalMessage } from "../../types/message.js";
import { ClaudeMapper } from "./ClaudeMapper.js";
import { config } from "../../utils/config.js";

export interface ClaudeProviderOptions {
  apiKey?: string;
  model?: string;
}

export class ClaudeProvider implements Provider {
  name = "claude";
  model?: string;
  private client: Anthropic;

  constructor(options: ClaudeProviderOptions = {}) {
    const apiKey = options.apiKey ?? config.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error(
        "ClaudeProvider: no API key available. Pass { apiKey } explicitly or set ANTHROPIC_API_KEY."
      );
    }

    this.client = new Anthropic({ apiKey });
    this.model = options.model;
  }

  async chat(
    history: CanonicalMessage[],
    tools: IToolOptions[] = [],
    options: ChatOptions = {}
  ): Promise<AIResponse> {
    const model = options.model ?? this.model;
    if (!model) {
      throw new Error(
        "ClaudeProvider: 'model' is required. Pass it in constructor options or chat options."
      );
    }

    const { system, messages: claudeMessages } = ClaudeMapper.toClaudeMessages(history);
    const claudeTools = ClaudeMapper.mapTools(tools);

    const response = await this.client.messages.create({
      model,
      max_tokens: options.maxTokens ?? 4096,
      temperature: options.temperature,
      system,
      messages: claudeMessages,
      tools: claudeTools.length > 0 ? claudeTools : undefined,
    });

    return ClaudeMapper.fromClaudeResponse(response);
  }
}