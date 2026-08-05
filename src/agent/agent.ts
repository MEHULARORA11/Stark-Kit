// src/agent/Agent.ts
import type { Provider } from "../provider/provider.js";
import type { IToolOptions } from "../types/tools.js";
import type { IAgentOptions } from "../types/agent.js";

export class Agent {
  public name: string;
  public instructions: string;
  public provider: Provider;
  public tools: IToolOptions[];
  public maxSteps: number;
  public temperature?: number;
  public model?: string; // means now it's type is string | undefined

  constructor(options: IAgentOptions) {
    this.name = options.name || "DefaultAgent";
    this.instructions = options.instructions;
    this.provider = options.provider;
    this.tools = options.tools || [];
    this.maxSteps = options.maxSteps ?? 10;
    this.temperature = options.temperature;
    this.model = options.model;
  }
}