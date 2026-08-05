import  {z} from "zod";
import type { IToolOptions } from "../types/tools";
import { isToolResult } from "../types/tools";

// 3. Factory function
export function defineTool<T extends z.ZodType, R = any>(
  tool: IToolOptions<T, R>
): IToolOptions<T, R> {
  return {
    ...tool,
    execute: async (rawArgs: z.infer<T>): Promise<any> => {
      
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
      const result = await tool.execute(parsed.data);

      // 4. If outputType is defined, validate the tool's return value
      if (tool.outputType) {
        // Extract the actual data to validate — unwrap ToolResult if needed
        const dataToValidate = isToolResult(result)
          ? (result.success ? result.data : undefined)
          : result;

        // Only validate if there's actual data (skip on errors / undefined)
        if (dataToValidate !== undefined) {
          const outputParsed = tool.outputType.safeParse(dataToValidate);
          if (!outputParsed.success) {
            console.warn(
              `⚠️ [Tool: ${tool.name}] Output does not match outputType schema:`,
              outputParsed.error.message
            );
            // Return a structured error so the LLM can see the mismatch
            return {
              success: false,
              error: `Tool output validation failed: ${outputParsed.error.message}`,
            };
          }
        }
      }

      return result;
    }
  };
}