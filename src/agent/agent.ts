// src/agent/Agent.ts
import type { Provider } from "../provider/provider.js";
import type { IExecutableTool } from "../types/tools.js";
import type { IAgentOptions } from "../types/agent.js";

export class Agent {
  public name: string;
  public instructions: string;
  public provider: Provider;
  public tools: IExecutableTool[];
  public maxSteps: number;
  public temperature?: number;

  constructor(options: IAgentOptions) {
    this.name = options.name || "DefaultAgent";
    this.instructions = options.instructions;
    this.provider = options.provider;
    this.tools = options.tools || [];
    this.maxSteps = options.maxSteps ?? 10;
    this.temperature = options.temperature;
  }
}