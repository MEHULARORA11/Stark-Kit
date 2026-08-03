// src/provider/openai/OpenAIMapper.ts
import { zodToJsonSchema } from "zod-to-json-schema";
import type { IToolOptions } from "../../types/tools.js";
import type { ChatCompletionTool, ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { AIResponse } from "../provider.js";
import type { CanonicalMessage } from "../../types/message.js";

export class OpenAIMapper {
  static mapTools(tools: IToolOptions[]): ChatCompletionTool[] {
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

  /**
   * Canonical history -> OpenAI's native ChatCompletionMessageParam[].
   * This is the ONLY place that ever knows about `tool_call_id`,
   * `tool_calls`, or OpenAI's specific role/shape rules. run() and Agent
   * never construct these objects themselves.
   */
  static toOpenAIMessages(history: CanonicalMessage[]): ChatCompletionMessageParam[] {
    return history.map((msg): ChatCompletionMessageParam => {
      switch (msg.role) {
        case "system":
        case "developer":
        case "user":
          return { role: msg.role, content: msg.content };

        case "assistant":
          return {
            role: "assistant",
            content: msg.content,
            tool_calls: msg.toolCalls?.map(tc => ({
              id: tc.id,
              type: "function" as const,
              function: {
                name: tc.name,
                // OpenAI wants a JSON string here; args is a parsed object internally
                arguments: JSON.stringify(tc.args ?? {}),
              },
            })),
          };

        case "tool":
          return {
            role: "tool",
            tool_call_id: msg.result.toolCallId,
            content: msg.result.content,
          };

        default: {
          // Exhaustiveness guard: if CanonicalMessage grows a new variant,
          // this will fail to compile until this mapper is updated too.
          const _exhaustive: never = msg;
          throw new Error(`OpenAIMapper: unhandled message role: ${JSON.stringify(_exhaustive)}`);
        }
      }
    });
  }

  /**
   * OpenAI's native response choice -> canonical AIResponse.
   * No rawMessage passthrough needed anymore: everything the run loop
   * needs (content + clean toolCalls) is captured here, and the next
   * call to chat() rebuilds OpenAI's native shape from canonical history
   * via toOpenAIMessages() above.
   */
  static fromOpenAIChoice(choice: { content?: string | null; tool_calls?: any[] } | undefined): AIResponse {
    const toolCalls: { id: string; name: string; args: unknown }[] = [];

    if (choice?.tool_calls) {
      for (const tc of choice.tool_calls) {
        if (tc.type === "function") {
          let args: unknown = {};
          try {
            args = JSON.parse(tc.function.arguments);
          } catch {
            // AI sent malformed JSON args; surface as empty object rather
            // than crashing the whole provider call.
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