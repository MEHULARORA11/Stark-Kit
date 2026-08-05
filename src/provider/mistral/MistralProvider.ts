import { Mistral } from "@mistralai/mistralai";
import type { Provider, AIResponse, ChatOptions } from "../provider.js";
import type { IToolOptions } from "../../types/tools.js";
import type { CanonicalMessage } from "../../types/message.js";
import { MistralMapper } from "./MistralMapper.js";
import { config } from "../../utils/config.js";

export interface MistralProviderOptions {
  apiKey?: string;
  model?: string;
}

export class MistralProvider implements Provider {
  name = "mistral";
  model?: string;
  private client: Mistral;

  constructor(options: MistralProviderOptions = {}) {
    const apiKey = options.apiKey ?? config.MISTRAL_API_KEY;

    if (!apiKey) {
      throw new Error(
        "MistralProvider: no API key available. Pass { apiKey } explicitly or set MISTRAL_API_KEY."
      );
    }

    this.client = new Mistral({ apiKey });
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
        "MistralProvider: 'model' is required. Pass it in constructor options or chat options."
      );
    }

    const mistralTools = MistralMapper.mapTools(tools);
    const mistralMessages = MistralMapper.toMistralMessages(history);

    const response = await this.client.chat.complete({
      model,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      messages: mistralMessages,
      tools: mistralTools.length > 0 ? mistralTools : undefined,
    });

    return MistralMapper.fromMistralResponse(response);
  }
}