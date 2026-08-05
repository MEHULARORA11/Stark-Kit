import Anthropic from "@anthropic-ai/sdk";
import type { Provider, AIResponse, ChatOptions } from "../provider";
import type { CanonicalMessage } from "../../types/message";
import type { IToolOptions } from "../../types/tools";
import { ClaudeMapper } from "./ClaudeMapper";

export class ClaudeProvider implements Provider {
  private client: Anthropic;
  name = "claude";
  defaultModel: string;

  constructor(apiKey: string, model: string = "claude-3-5-sonnet-20241022") {
    this.client = new Anthropic({ apiKey });
    this.defaultModel = model;
  }

  async chat(
    history: CanonicalMessage[],
    tools?: IToolOptions[],
    options?: ChatOptions
  ): Promise<AIResponse> {
    const { system, messages: claudeMessages } = ClaudeMapper.toClaudeMessages(history);
    const claudeTools = tools && tools.length > 0 ? ClaudeMapper.toClaudeTools(tools) : undefined;

    const response = await this.client.messages.create({
      model: options?.model || this.defaultModel,
      max_tokens: options?.maxTokens || 4096,
      system,
      messages: claudeMessages,
      tools: claudeTools,
    });

    return ClaudeMapper.fromClaudeResponse(response);
  }
}