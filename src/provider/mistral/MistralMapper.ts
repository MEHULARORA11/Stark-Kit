import type { IToolOptions } from "../../types/tools.js";
import type { AIResponse } from "../provider.js";
import type { CanonicalMessage } from "../../types/message.js";
import z from "zod";

export class MistralMapper {
  static mapTools(tools: IToolOptions[]): any[] {
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

  static toMistralMessages(history: CanonicalMessage[]): any[] {
    return history.map((msg) => {
      if (msg.role === "tool") {
        return {
          role: "tool",
          name: (msg as any).name || "tool_result",
          content: typeof msg.result.content === "string" ? msg.result.content : JSON.stringify(msg.result.content ?? ""),
          tool_call_id: msg.result.toolCallId,
        };
      }

      if (msg.role === "assistant" && msg.toolCalls?.length) {
        return {
          role: "assistant",
          content: msg.content || "",
          tool_calls: msg.toolCalls.map((call) => ({
            id: call.id,
            type: "function",
            function: {
              name: call.name,
              arguments: typeof call.args === "string" ? call.args : JSON.stringify(call.args ?? {}),
            },
          })),
        };
      }

      return {
        role: msg.role === "developer" ? "system" : msg.role,
        content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
      };
    });
  }

  static fromMistralResponse(response: any): AIResponse {
    const choice = response.choices?.[0];
    const message = choice?.message;

    const rawToolCalls = message?.toolCalls || message?.tool_calls || [];
    const toolCalls: { id: string; name: string; args: unknown }[] = [];

    for (const tc of rawToolCalls) {
      let args: unknown = {};
      try {
        args = typeof tc.function.arguments === "string"
          ? JSON.parse(tc.function.arguments)
          : tc.function.arguments;
      } catch {
        args = {};
      }
      toolCalls.push({
        id: tc.id,
        name: tc.function.name,
        args,
      });
    }

    return {
      content: message?.content ?? null,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  }
}