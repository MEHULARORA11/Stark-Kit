import Anthropic from "@anthropic-ai/sdk";
import type { Provider, AIResponse, ChatOptions, StreamChunk } from "../provider.js";
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

    // Map provider-agnostic toolChoice to Claude's tool_choice format
    let toolChoice: any = undefined;
    if (options.toolChoice && claudeTools.length > 0) {
      if (options.toolChoice === "auto") {
        toolChoice = { type: "auto" };
      } else if (options.toolChoice === "required") {
        // Claude's "any" means the model MUST call at least one tool
        toolChoice = { type: "any" };
      } else if (typeof options.toolChoice === "object") {
        toolChoice = { type: "tool", name: options.toolChoice.name };
      }
    }

    const response = await this.client.messages.create({
      model,
      max_tokens: options.maxTokens ?? 4096,
      temperature: options.temperature,
      system,
      messages: claudeMessages,
      tools: claudeTools.length > 0 ? claudeTools : undefined,
      tool_choice: toolChoice,
    });

    return ClaudeMapper.fromClaudeResponse(response);
  }

  /**
   * Streaming variant of `chat`. Yields provider-agnostic `StreamChunk`
   * objects as they arrive from Claude's streaming API. The final chunk is
   * always `{ type: "done", response }` carrying the assembled AIResponse.
   */
  async *chatStream(
    history: CanonicalMessage[],
    tools: IToolOptions[] = [],
    options: ChatOptions = {}
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const model = options.model ?? this.model;
    if (!model) {
      throw new Error(
        "ClaudeProvider: 'model' is required. Pass it in constructor options or chat options."
      );
    }

    const { system, messages: claudeMessages } = ClaudeMapper.toClaudeMessages(history);
    const claudeTools = ClaudeMapper.mapTools(tools);

    // Map provider-agnostic toolChoice to Claude's tool_choice format
    let toolChoiceStream: any = undefined;
    if (options.toolChoice && claudeTools.length > 0) {
      if (options.toolChoice === "auto") {
        toolChoiceStream = { type: "auto" };
      } else if (options.toolChoice === "required") {
        toolChoiceStream = { type: "any" };
      } else if (typeof options.toolChoice === "object") {
        toolChoiceStream = { type: "tool", name: options.toolChoice.name };
      }
    }

    const stream = await this.client.messages.create({
      model,
      max_tokens: options.maxTokens ?? 4096,
      temperature: options.temperature,
      system,
      messages: claudeMessages,
      tools: claudeTools.length > 0 ? claudeTools : undefined,
      tool_choice: toolChoiceStream,
      stream: true,
    });

    let accumulatedText = "";
    const activeToolCalls = new Map<
      number,
      { id: string; name: string; argsJson: string }
    >();
    const completedToolCalls: { id: string; name: string; args: unknown }[] = [];

    for await (const event of stream) {
      switch (event.type) {
        case "content_block_start": {
          const block = event.content_block;
          if (block.type === "text") {
            if (block.text) {
              accumulatedText += block.text;
              yield { type: "text", delta: block.text };
            }
          } else if (block.type === "tool_use") {
            activeToolCalls.set(event.index, {
              id: block.id,
              name: block.name,
              argsJson: "",
            });
          }
          break;
        }

        case "content_block_delta": {
          const delta = event.delta;
          if (delta.type === "text_delta") {
            accumulatedText += delta.text;
            yield { type: "text", delta: delta.text };
          } else if (delta.type === "input_json_delta") {
            const toolCall = activeToolCalls.get(event.index);
            if (toolCall) {
              toolCall.argsJson += delta.partial_json;
              yield {
                type: "tool_call",
                id: toolCall.id,
                name: toolCall.name,
                argsDelta: delta.partial_json,
              };
            }
          }
          break;
        }

        case "content_block_stop": {
          const toolCall = activeToolCalls.get(event.index);
          if (toolCall) {
            let parsedArgs: unknown = {};
            if (toolCall.argsJson.trim()) {
              try {
                parsedArgs = JSON.parse(toolCall.argsJson);
              } catch {
                parsedArgs = {};
              }
            }
            completedToolCalls.push({
              id: toolCall.id,
              name: toolCall.name,
              args: parsedArgs,
            });
            yield {
              type: "tool_call_done",
              id: toolCall.id,
              name: toolCall.name,
              args: parsedArgs,
            };
            activeToolCalls.delete(event.index);
          }
          break;
        }

        default:
          break;
      }
    }

    const response: AIResponse = {
      content: accumulatedText || null,
      toolCalls: completedToolCalls.length > 0 ? completedToolCalls : undefined,
    };

    yield { type: "done", response };
  }
}