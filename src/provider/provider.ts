import type { IToolOptions } from "../types/tools.js";

export interface AIResponse {
  content: string | null;
  // 👉 1. Add id: string here!
  toolCalls?: { id: string; name: string; args: unknown }[];
  // 👉 2. Add rawMessage so we can save the exact native OpenAI format
  rawMessage?: any; 
}

export interface Provider {
  name: string;
  chat(messages: any[], tools: IToolOptions[]): Promise<AIResponse>;
}