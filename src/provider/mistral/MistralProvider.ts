import { Mistral } from "@mistralai/mistralai";
import type { Provider, AIResponse, ChatOptions, StreamChunk } from "../provider.js";
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

  async *chatStream(
    history: CanonicalMessage[],
    tools: IToolOptions[] = [],
    options: ChatOptions = {}
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const model = options.model ?? this.model;
    if (!model) {
      throw new Error(
        "MistralProvider: 'model' is required. Pass it in constructor options or chat options."
      );
    }

    const mistralTools = MistralMapper.mapTools(tools);
    const mistralMessages = MistralMapper.toMistralMessages(history);

    let accumulatedContent = "";

    interface ActiveToolCall {
      id: string;
      name: string;
      argsRaw: string;
    }
    const toolCallsMap = new Map<number, ActiveToolCall>();

    try {
      const stream = await this.client.chat.stream({
        model,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        messages: mistralMessages,
        tools: mistralTools.length > 0 ? mistralTools : undefined,
      });

      for await (const event of stream) {
        const chunk = (event as any)?.data ?? event;
        const choice = chunk?.choices?.[0];
        if (!choice) continue;

        const delta = choice.delta;
        if (!delta) continue;

        // Handle text delta
        if (delta.content) {
          let textDelta = "";
          if (typeof delta.content === "string") {
            textDelta = delta.content;
          } else if (Array.isArray(delta.content)) {
            textDelta = delta.content
              .map((c: any) => (typeof c === "string" ? c : c?.text ?? ""))
              .join("");
          }

          if (textDelta) {
            accumulatedContent += textDelta;
            yield { type: "text", delta: textDelta };
          }
        }

        // Handle tool calls delta
        const toolCallsDelta = delta.toolCalls ?? delta.tool_calls;
        if (Array.isArray(toolCallsDelta)) {
          for (let i = 0; i < toolCallsDelta.length; i++) {
            const tc = toolCallsDelta[i];
            const index = tc.index ?? i;

            let activeCall = toolCallsMap.get(index);
            if (!activeCall) {
              activeCall = {
                id: tc.id ?? "",
                name: tc.function?.name ?? "",
                argsRaw: "",
              };
              toolCallsMap.set(index, activeCall);
            } else {
              if (tc.id && !activeCall.id) {
                activeCall.id = tc.id;
              }
              if (tc.function?.name && !activeCall.name) {
                activeCall.name = tc.function.name;
              }
            }

            const argsDelta = tc.function?.arguments ?? "";
            if (typeof argsDelta === "string") {
              activeCall.argsRaw += argsDelta;
            }

            yield {
              type: "tool_call",
              id: activeCall.id,
              name: activeCall.name,
              argsDelta: typeof argsDelta === "string" ? argsDelta : "",
            };
          }
        }
      }

      // Finalize tool calls
      const toolCalls: { id: string; name: string; args: unknown }[] = [];
      for (const [, activeCall] of toolCallsMap) {
        let parsedArgs: unknown = {};
        try {
          parsedArgs = activeCall.argsRaw ? JSON.parse(activeCall.argsRaw) : {};
        } catch {
          parsedArgs = {};
        }

        yield {
          type: "tool_call_done",
          id: activeCall.id,
          name: activeCall.name,
          args: parsedArgs,
        };

        toolCalls.push({
          id: activeCall.id,
          name: activeCall.name,
          args: parsedArgs,
        });
      }

      const response: AIResponse = {
        content: accumulatedContent.length > 0 ? accumulatedContent : null,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      };

      yield {
        type: "done",
        response,
      };
    } catch (error) {
      throw error;
    }
  }
}