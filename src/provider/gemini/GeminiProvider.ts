import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Provider, AIResponse, ChatOptions } from "../provider.js";
import type { CanonicalMessage } from "../../types/message.js";
import type { IToolOptions } from "../../types/tools.js";
import { GeminiMapper } from "./GeminiMapper.js";

export class GeminiProvider implements Provider {
  name = "gemini";
  defaultModel: string;
  private ai: GoogleGenerativeAI;

  constructor(apiKey: string, model: string = "gemini-1.5-pro") {
    this.ai = new GoogleGenerativeAI(apiKey);
    this.defaultModel = model;
  }

  async chat(
    history: CanonicalMessage[],
    tools: IToolOptions[] = [],
    options: ChatOptions = {}
  ): Promise<AIResponse> {
    const { systemInstruction, contents } = GeminiMapper.toGeminiContents(history);
    const geminiTools = tools.length > 0 ? GeminiMapper.toGeminiTools(tools) : undefined;

    const modelInstance = this.ai.getGenerativeModel({
      model: options.model ?? this.defaultModel,
      systemInstruction,
      tools: geminiTools,
    });

    const response = await modelInstance.generateContent({ contents });
    return GeminiMapper.fromGeminiResponse(response);
  }
}