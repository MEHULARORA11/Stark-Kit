import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Provider, AIResponse, ChatOptions } from "../provider.js";
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

    const modelInstance = this.ai.getGenerativeModel({
      model,
      systemInstruction,
      tools: geminiTools.length > 0 ? geminiTools : undefined,
      generationConfig: {
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens,
      },
    });

    const response = await modelInstance.generateContent({ contents });
    return GeminiMapper.fromGeminiResponse(response);
  }
}