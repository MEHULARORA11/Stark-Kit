import type { IToolOptions } from "../../types/tools.js";
import type { AIResponse } from "../provider.js";
import type { CanonicalMessage } from "../../types/message.js";
import z from "zod";

// Maps canonical models and messages to and from Mistral API formats.
export class MistralMapper {
  // Maps a list of Stark-Kit tools to Mistral API tool definitions.
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

  // Maps canonical message history into Mistral-compliant request message array format.
  static toMistralMessages(history: CanonicalMessage[]): any[] {
    return history.map((msg) => {
      if (msg.role === "tool") {
        return {
          role: "tool",
          name: (msg as any).name || "tool_result",
          content: typeof msg.result.content === "string" ? msg.result.content : JSON.stringify(msg.result.content ?? ""),
          toolCallId: msg.result.toolCallId,
        };
      }

      if (msg.role === "assistant" && msg.toolCalls?.length) {
        const assistantMsg: any = {
          role: "assistant",
          toolCalls: msg.toolCalls.map((call) => ({
            id: call.id,
            type: "function",
            function: {
              name: call.name,
              arguments: typeof call.args === "string" ? call.args : JSON.stringify(call.args ?? {}),
            },
          })),
        };

        assistantMsg.content = msg.content ? msg.content : null;

        return assistantMsg;
      }

      return {
        role: msg.role === "developer" ? "system" : msg.role,
        content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
      };
    });
  }

  // Normalizes a Mistral API response back to a canonical AIResponse.
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