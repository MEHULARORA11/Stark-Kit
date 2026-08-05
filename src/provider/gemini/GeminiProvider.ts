import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Provider, AIResponse, ChatOptions, StreamChunk } from "../provider.js";
import type { IToolOptions } from "../../types/tools.js";
import type { CanonicalMessage } from "../../types/message.js";
import { GeminiMapper } from "./GeminiMapper.js";
import { config } from "../../utils/config.js";

export interface GeminiProviderOptions {
  apiKey?: string;
  model?: string;
}

export class GeminiProvider implements Provider {
  name = "gemini";
  model?: string;
  private ai: GoogleGenerativeAI;

  constructor(options: GeminiProviderOptions = {}) {
    const apiKey = options.apiKey ?? config.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "GeminiProvider: no API key available. Pass { apiKey } explicitly or set GEMINI_API_KEY."
      );
    }

    this.ai = new GoogleGenerativeAI(apiKey);
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
        "GeminiProvider: 'model' is required. Pass it in constructor options or chat options."
      );
    }

    const { systemInstruction, contents } = GeminiMapper.toGeminiContents(history);
    const geminiTools = GeminiMapper.mapTools(tools);

    // Map provider-agnostic toolChoice to Gemini's toolConfig format
    let toolConfig: any = undefined;
    if (options.toolChoice && geminiTools.length > 0) {
      if (options.toolChoice === "auto") {
        toolConfig = { functionCallingConfig: { mode: "AUTO" } };
      } else if (options.toolChoice === "required") {
        // Gemini "ANY" means the model MUST call one of the provided functions
        toolConfig = { functionCallingConfig: { mode: "ANY" } };
      } else if (typeof options.toolChoice === "object") {
        toolConfig = {
          functionCallingConfig: {
            mode: "ANY",
            allowedFunctionNames: [options.toolChoice.name],
          },
        };
      }
    }

    const modelInstance = this.ai.getGenerativeModel({
      model,
      systemInstruction,
      tools: geminiTools.length > 0 ? geminiTools : undefined,
      toolConfig,
      generationConfig: {
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens,
      },
    });

    const response = await modelInstance.generateContent({ contents });
    return GeminiMapper.fromGeminiResponse(response);
  }

  async *chatStream(
    history: CanonicalMessage[],
    tools: IToolOptions[] = [],
    options: ChatOptions = {}
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const model = options.model ?? this.model;
    if (!model) {
      throw new Error(
        "GeminiProvider: 'model' is required. Pass it in constructor options or chat options."
      );
    }

    const { systemInstruction, contents } = GeminiMapper.toGeminiContents(history);
    const geminiTools = GeminiMapper.mapTools(tools);

    // Map provider-agnostic toolChoice to Gemini's toolConfig format
    let toolConfigStream: any = undefined;
    if (options.toolChoice && geminiTools.length > 0) {
      if (options.toolChoice === "auto") {
        toolConfigStream = { functionCallingConfig: { mode: "AUTO" } };
      } else if (options.toolChoice === "required") {
        toolConfigStream = { functionCallingConfig: { mode: "ANY" } };
      } else if (typeof options.toolChoice === "object") {
        toolConfigStream = {
          functionCallingConfig: {
            mode: "ANY",
            allowedFunctionNames: [options.toolChoice.name],
          },
        };
      }
    }

    const modelInstance = this.ai.getGenerativeModel({
      model,
      systemInstruction,
      tools: geminiTools.length > 0 ? geminiTools : undefined,
      toolConfig: toolConfigStream,
      generationConfig: {
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens,
      },
    });

    let accumulatedText = "";
    const accumulatedToolCalls: { id: string; name: string; args: unknown }[] = [];

    try {
      const responseStream = await modelInstance.generateContentStream({ contents });

      for await (const chunk of responseStream.stream) {
        const candidate = chunk.candidates?.[0];
        const parts = candidate?.content?.parts || [];

        for (const part of parts) {
          if (part.text) {
            accumulatedText += part.text;
            yield {
              type: "text",
              delta: part.text,
            };
          } else if (part.functionCall) {
            const callId =
              (part.functionCall as any).id ||
              `call_${Math.random().toString(36).substring(2, 9)}`;
            const name = part.functionCall.name;

            let args: any = part.functionCall.args;
            if (typeof args === "string") {
              try {
                args = JSON.parse(args);
              } catch {
                args = {};
              }
            } else {
              args = args ? { ...args } : {};
            }

            const ts = (part as any).thoughtSignature || (part as any).thought_signature;
            if (ts) {
              args._thoughtSignature = ts;
            }

            const argsDelta = JSON.stringify(args);

            yield {
              type: "tool_call",
              id: callId,
              name,
              argsDelta,
            };

            yield {
              type: "tool_call_done",
              id: callId,
              name,
              args,
            };

            accumulatedToolCalls.push({
              id: callId,
              name,
              args,
            });
          }
        }
      }
    } catch (error) {
      throw new Error(
        `GeminiProvider: streaming error: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    const finalResponse: AIResponse = {
      content: accumulatedText || null,
      toolCalls: accumulatedToolCalls.length > 0 ? accumulatedToolCalls : undefined,
    };

    yield {
      type: "done",
      response: finalResponse,
    };
  }
}