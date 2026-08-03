// src/types/agent.ts
import type { Provider } from "../provider/provider.js";
import type { IToolOptions } from "./tools.js";

export interface IAgentOptions {
  name: string;
  instructions: string; // The system prompt
  provider: Provider;
  tools?: IToolOptions[];
  maxSteps?: number;    // Prevents infinite while-loops
  temperature?: number;
}