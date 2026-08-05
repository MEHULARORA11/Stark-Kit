import OpenAI from "openai";
import type { Provider, AIResponse, ChatOptions } from "../provider.js";
import type { IToolOptions } from "../../types/tools.js";
import type { CanonicalMessage } from "../../types/message.js";
import { OpenAIMapper } from "./OpenAIMapper.js";
import { config } from "../../utils/config.js";

export interface OpenAIProviderOptions {
  apiKey?: string;
  model?: string;
}

export class OpenAIProvider implements Provider {
  name = "openai";
  model?: string;
  private client: OpenAI;

  constructor(options: OpenAIProviderOptions = {}) {
    const apiKey = options.apiKey ?? config.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "OpenAIProvider: no API key available. Pass { apiKey } explicitly or set OPENAI_API_KEY."
      );
    }

    this.client = new OpenAI({ apiKey });
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
        "OpenAIProvider: 'model' is required. Pass it in constructor options or chat options."
      );
    }

    const openaiTools = OpenAIMapper.mapTools(tools);
    const openaiMessages = OpenAIMapper.toOpenAIMessages(history);

    const response = await this.client.chat.completions.create({
      model,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      messages: openaiMessages,
      tools: openaiTools.length > 0 ? openaiTools : undefined,
    });

    const choice = response.choices[0]?.message;
    return OpenAIMapper.fromOpenAIChoice(choice);
  }
}