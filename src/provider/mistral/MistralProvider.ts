import { Mistral } from "@mistralai/mistralai";
import type { Provider, AIResponse, ChatOptions } from "../provider.js";
import type { CanonicalMessage } from "../../types/message.js";
import type { IToolOptions } from "../../types/tools.js";
import { MistralMapper } from "./MistralMapper.js";

export class MistralProvider implements Provider {
  name = "mistral";
  defaultModel: string;
  private client: Mistral;

  constructor(apiKey: string, model: string = "mistral-large-latest") {
    this.client = new Mistral({ apiKey });
    this.defaultModel = model;
  }

  async chat(
    history: CanonicalMessage[],
    tools: IToolOptions[] = [],
    options: ChatOptions = {}
  ): Promise<AIResponse> {
    const mistralMessages = MistralMapper.toMistralMessages(history);
    const mistralTools = tools.length > 0 ? MistralMapper.toMistralTools(tools) : undefined;

    const response = await this.client.chat.complete({
      model: options.model ?? this.defaultModel,
      messages: mistralMessages,
      tools: mistralTools,
    });

    return MistralMapper.fromMistralResponse(response);
  }
}