// src/providers/openai/OpenAIMapper.ts
import { zodToJsonSchema } from "zod-to-json-schema";
import type { IExecutableTool } from "../../types/tools.js";
import type { ChatCompletionTool } from "openai/resources/chat/completions";

export class OpenAIMapper {
  static mapTools(tools: IExecutableTool[]): ChatCompletionTool[] {
    return tools.map(tool => {
      // 1. Translate Zod to JSON Schema
      const jsonSchema = zodToJsonSchema(tool.parameters as any) as any;

      // 2. OpenAI hates the "$schema" key, so we delete it safely
      if (jsonSchema.$schema) {
        delete jsonSchema.$schema;
      }

      // 3. Ensure OpenAI always gets a 'type: "object"' at the root
      // Even if the user provided no parameters, we give OpenAI an empty object
      const safeParameters = jsonSchema.type === "object" 
        ? jsonSchema 
        : { type: "object", properties: {} };

      return {
        type: "function" as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: safeParameters
        }
      };
    });
  }
}