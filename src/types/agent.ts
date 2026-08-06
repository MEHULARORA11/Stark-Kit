import type { Provider } from "../provider/provider.js";
import type { IToolOptions } from "./tools.js";
import type { CanonicalMessage } from "./message.js";
import type { z } from "zod";

// Async hooks that run at key lifecycle points inside the agentic loop.
export interface AgentHooks {
  beforeChat?(history: CanonicalMessage[]): Promise<CanonicalMessage[] | void>;
  beforeTool?(toolName: string, args: unknown): Promise<unknown | void>;
  afterTool?(toolName: string, result: string, isError: boolean): Promise<string | void>;
}

// Configuration options for creating an Agent.
export interface IAgentOptions {
  name: string;
  instructions: string;
  provider: Provider;
  tools?: IToolOptions[];
  maxSteps?: number;
  temperature?: number;
  model?: string;
  hooks?: AgentHooks;
  outputType?: z.ZodType;
}