import type { IToolOptions } from "../../types/tools.js";
import type { ChatCompletionTool, ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { AIResponse } from "../provider.js";
import type { CanonicalMessage } from "../../types/message.js";
import z from "zod";

// Maps canonical messages and tools to and from OpenAI API formats.
export class OpenAIMapper {
  // Maps a list of Stark-Kit tools to OpenAI ChatCompletionTool definitions.
  static mapTools(tools: IToolOptions[]): ChatCompletionTool[] {
    return tools.map((tool) => {
      const jsonSchema = z.toJSONSchema(tool.parameters as any) as any;

      if (jsonSchema.$schema) {
        delete jsonSchema.$schema;
      }

      const safeParameters =
        jsonSchema.type === "object"
          ? jsonSchema
          : { type: "object", properties: {} };

      return {
        type: "function" as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: safeParameters,
        },
      };
    });
  }

  // Maps canonical message history into OpenAI's native message param formats.
  static toOpenAIMessages(history: CanonicalMessage[]): ChatCompletionMessageParam[] {
    return history.map((msg): ChatCompletionMessageParam => {
      switch (msg.role) {
        case "system":
        case "developer":
        case "user":
          return { role: msg.role, content: msg.content };

        case "assistant":
          return {
            role: msg.role,
            content: msg.content,
            tool_calls: msg.toolCalls?.map((tc) => ({
              id: tc.id,
              type: "function" as const,
              function: {
                name: tc.name,
                arguments: typeof tc.args === "string" ? tc.args : JSON.stringify(tc.args ?? {}),
              },
            })),
          };

        case "tool":
          return {
            role: "tool",
            tool_call_id: msg.result.toolCallId,
            content: typeof msg.result.content === "string" ? msg.result.content : JSON.stringify(msg.result.content ?? ""),
          };

        default: {
          const _exhaustive: never = msg;
          throw new Error(`OpenAIMapper: unhandled message role: ${JSON.stringify(_exhaustive)}`);
        }
      }
    });
  }

  // Normalizes an OpenAI response choice back to a canonical AIResponse.
  static fromOpenAIChoice(choice: { content?: string | null; tool_calls?: any[] } | undefined): AIResponse {
    const toolCalls: { id: string; name: string; args: unknown }[] = [];

    if (choice?.tool_calls) {
      for (const tc of choice.tool_calls) {
        if (tc.type === "function") {
          let args: unknown = {};
          try {
            args = JSON.parse(tc.function.arguments);
          } catch {
            args = {};
          }
          toolCalls.push({ id: tc.id, name: tc.function.name, args });
        }
      }
    }

    return {
      content: choice?.content ?? null,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  }
}