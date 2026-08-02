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

// 3. Factory function
export function defineTool<T extends z.ZodType, R = any>(
  tool: IToolOptions<T, R>
): IExecutableTool<T, R> {
  return {
    ...tool,
    execute: async (rawArgs: unknown): Promise<R> => {
      // Safely parse raw JSON args with Zod
      const parsedArgs = tool.parameters.parse(rawArgs);
      // Pass typed args to user function
      return tool.execute(parsedArgs);
    }
  };
}
