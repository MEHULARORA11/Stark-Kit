import type { IExecutableTool } from "../types/tools.js";

export interface AIResponse {
  content: string | null;
  toolCalls?: { name: string; args: unknown }[];
}

export interface Provider {
  name: string;
  // Every provider must implement this generic chat function
  chat(messages: any[], tools: IExecutableTool[]): Promise<AIResponse>;
}