import OpenAI from "openai";
import type { Provider, AIResponse, ChatOptions, StreamChunk } from "../provider.js";
import type { IToolOptions } from "../../types/tools.js";
import type { CanonicalMessage } from "../../types/message.js";
import { OpenAIMapper } from "./OpenAIMapper.js";
import { config } from "../../utils/config.js";

// Options to configure the OpenAI LLM Provider.
export interface OpenAIProviderOptions {
  apiKey?: string;
  model?: string;
}

// Provider adapter for the OpenAI API.
export class OpenAIProvider implements Provider {
  name = "openai";
  model?: string;
  private client: OpenAI;

  // Initializes a new instance of the OpenAIProvider class.
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

  // Sends the message history to the OpenAI API and returns the canonical response.
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

    let toolChoice: any = undefined;
    if (options.toolChoice && openaiTools.length > 0) {
      if (options.toolChoice === "auto") {
        toolChoice = "auto";
      } else if (options.toolChoice === "required") {
        toolChoice = "required";
      } else if (typeof options.toolChoice === "object") {
        toolChoice = {
          type: "function" as const,
          function: { name: options.toolChoice.name },
        };
      }
    }

    const response = await this.client.chat.completions.create({
      model,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      messages: openaiMessages,
      tools: openaiTools.length > 0 ? openaiTools : undefined,
      tool_choice: toolChoice,
    });

    const choice = response.choices[0]?.message;
    return OpenAIMapper.fromOpenAIChoice(choice);
  }

  // Sends message history to the OpenAI API and yields streaming response chunks.
  async *chatStream(
    history: CanonicalMessage[],
    tools: IToolOptions[] = [],
    options: ChatOptions = {}
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const model = options.model ?? this.model;
    if (!model) {
      throw new Error(
        "OpenAIProvider: 'model' is required. Pass it in constructor options or chat options."
      );
    }

    const openaiTools = OpenAIMapper.mapTools(tools);
    const openaiMessages = OpenAIMapper.toOpenAIMessages(history);

    let toolChoiceStream: any = undefined;
    if (options.toolChoice && openaiTools.length > 0) {
      if (options.toolChoice === "auto") {
        toolChoiceStream = "auto";
      } else if (options.toolChoice === "required") {
        toolChoiceStream = "required";
      } else if (typeof options.toolChoice === "object") {
        toolChoiceStream = {
          type: "function" as const,
          function: { name: options.toolChoice.name },
        };
      }
    }

    const stream = await this.client.chat.completions.create({
      model,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      messages: openaiMessages,
      tools: openaiTools.length > 0 ? openaiTools : undefined,
      tool_choice: toolChoiceStream,
      stream: true,
    });

    let accumulatedContent: string | null = null;
    const toolCallsByIndex = new Map<
      number,
      { id: string; name: string; argsString: string }
    >();

    for await (const chunk of stream) {
      const choice = chunk.choices[0];
      if (!choice) continue;

      const delta = choice.delta;
      if (!delta) continue;

      if (delta.content) {
        if (accumulatedContent === null) {
          accumulatedContent = "";
        }
        accumulatedContent += delta.content;
        yield { type: "text", delta: delta.content };
      }

      if (delta.tool_calls) {
        for (const tcDelta of delta.tool_calls) {
          const index = tcDelta.index;
          let toolCall = toolCallsByIndex.get(index);

          if (!toolCall) {
            toolCall = {
              id: tcDelta.id ?? "",
              name: tcDelta.function?.name ?? "",
              argsString: "",
            };
            toolCallsByIndex.set(index, toolCall);
          } else {
            if (tcDelta.id) {
              toolCall.id = tcDelta.id;
            }
            if (tcDelta.function?.name) {
              toolCall.name = tcDelta.function.name;
            }
          }

          const argsDelta = tcDelta.function?.arguments ?? "";
          if (argsDelta) {
            toolCall.argsString += argsDelta;
          }

          yield {
            type: "tool_call",
            id: toolCall.id,
            name: toolCall.name,
            argsDelta,
          };
        }
      }
    }

    const finalToolCalls: { id: string; name: string; args: unknown }[] = [];

    for (const toolCall of toolCallsByIndex.values()) {
      let parsedArgs: unknown = {};
      try {
        parsedArgs = JSON.parse(toolCall.argsString);
      } catch {
        parsedArgs = {};
      }

      yield {
        type: "tool_call_done",
        id: toolCall.id,
        name: toolCall.name,
        args: parsedArgs,
      };

      finalToolCalls.push({
        id: toolCall.id,
        name: toolCall.name,
        args: parsedArgs,
      });
    }

    const response: AIResponse = {
      content: accumulatedContent,
      toolCalls: finalToolCalls.length > 0 ? finalToolCalls : undefined,
    };

    yield { type: "done", response };
  }
}