import { z } from "zod";

// 1. Definition options provided by the caller
export interface IToolOptions<TParameters extends z.ZodType = z.ZodType, R = any> {
  name: string;
  description: string;
  parameters: TParameters;
  execute: (args: z.infer<TParameters>) => Promise<R>;
}

// 2. The wrapped tool interface returned by defineTool (accepts raw/unknown input)
export interface IExecutableTool<TParameters extends z.ZodType = z.ZodType, R = any> {
  name: string;
  description: string;
  parameters: TParameters;
  execute: (rawArgs: unknown) => Promise<R>;
}
