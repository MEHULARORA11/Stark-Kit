import type { Provider } from "../provider/provider.js";
import type { IToolOptions } from "../types/tools.js";
import type { IAgentOptions, AgentHooks } from "../types/agent.js";
import type { z } from "zod";

// Represents an agent configured with a provider, instructions, and tools.
export class Agent {
  public name: string;
  public instructions: string;
  public provider: Provider;
  public tools: IToolOptions[];
  public maxSteps: number;
  public temperature?: number;
  public model?: string;
  public hooks: AgentHooks;
  public outputType?: z.ZodType;

  // Initializes a new instance of the Agent class.
  constructor(options: IAgentOptions) {
    this.name = options.name || "DefaultAgent";
    this.instructions = options.instructions;
    this.provider = options.provider;
    this.tools = options.tools || [];
    this.maxSteps = options.maxSteps ?? 10;
    this.temperature = options.temperature;
    this.model = options.model;
    this.hooks = options.hooks ?? {};
    this.outputType = options.outputType;
  }
}