import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Provider, AIResponse, ChatOptions } from "../provider"; // Added AIResponse and ChatOptions
import type { CanonicalMessage } from "../../types/message"; // Replaced Message with CanonicalMessage
import type { IToolOptions } from "../../types/tools";
import { GeminiMapper } from "./GeminiMapper";

export class GeminiProvider implements Provider {
  private ai: GoogleGenerativeAI;
  name = "gemini"; // Added required provider name
  defaultModel: string; // Renamed from 'model' to 'defaultModel' to match Provider interface

  constructor(apiKey: string, model: string = "gemini-1.5-pro") {
    this.ai = new GoogleGenerativeAI(apiKey);
    this.defaultModel = model;
  }

  // Renamed 'generate' to 'chat' to fulfill the Provider interface
  async chat(
    history: CanonicalMessage[],
    tools?: IToolOptions[],
    options?: ChatOptions
  ): Promise<AIResponse> {
    const { systemInstruction, contents } = GeminiMapper.toGeminiContents(history);
    const geminiTools = tools && tools.length > 0 ? GeminiMapper.toGeminiTools(tools) : undefined;

    const modelInstance = this.ai.getGenerativeModel({
      model: options?.model || this.defaultModel, // Added support for overriding the model via ChatOptions
      systemInstruction,
      tools: geminiTools,
    });

    const response = await modelInstance.generateContent({ contents });
    return GeminiMapper.fromGeminiResponse(response);
  }
}