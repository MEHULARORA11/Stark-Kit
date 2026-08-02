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
    execute: async (rawArgs: unknown): Promise<any> => {
      
      // 1. Use safeParse instead of parse!
      const parsed = tool.parameters.safeParse(rawArgs);
      
      // 2. If the AI sent bad data, catch it gracefully
      if (!parsed.success) {
        console.error(`❌ [Tool: ${tool.name}] AI provided invalid arguments:`, rawArgs);
        
        // Return the error so the Agent doesn't crash. 
        // (In advanced agents, you feed this string back to the AI so it can try again!)
        return `Failed to execute tool. Invalid arguments: ${parsed.error.message}`;
      }
      
      // 3. If it succeeded, run the tool logic
      console.log(`✅ [Tool: ${tool.name}] Executing with clean data:`, parsed.data);
      return tool.execute(parsed.data);
    }
  };
}

// 4. Correct Usage
const tool = defineTool({
  name: "hey",
  description: "A sample tool",
  parameters: z.object({
    message:z.string
  }),
  execute: async ({}) => {
    return `Received: `;
  }
});