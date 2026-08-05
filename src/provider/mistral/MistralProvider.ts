import { Mistral } from "@mistralai/mistralai";
import type { Provider, AIResponse, ChatOptions } from "../provider";
import type { CanonicalMessage } from "../../types/message";
import type { IToolOptions } from "../../types/tools";
import { MistralMapper } from "./MistralMapper";

export class MistralProvider implements Provider {
  private client: Mistral;
  name = "mistral"; // Required by Provider interface
  defaultModel: string; // Renamed to match the other providers

  constructor(apiKey: string, model: string = "mistral-large-latest") {
    this.client = new Mistral({ apiKey });
    this.defaultModel = model;
  }

  // Renamed to 'chat' to fulfill the Provider interface
  async chat(
    history: CanonicalMessage[],
    tools?: IToolOptions[],
    options?: ChatOptions
  ): Promise<AIResponse> {
    const mistralMessages = MistralMapper.toMistralMessages(history);
    const mistralTools = tools && tools.length > 0 ? MistralMapper.toMistralTools(tools) : undefined;

    const response = await this.client.chat.complete({
      model: options?.model || this.defaultModel, // Use override if passed in options
      messages: mistralMessages,
      tools: mistralTools,
    });

    return MistralMapper.fromMistralResponse(response);
  }
}