// src/types/agent.ts
import type { Provider } from "../provider/provider.js";
import type { IExecutableTool } from "./tools.js";

export interface IAgentOptions {
  name: string;
  instructions: string; // The system prompt
  provider: Provider;
  tools?: IExecutableTool[];
  maxSteps?: number;    // Prevents infinite while-loops
  temperature?: number;
}