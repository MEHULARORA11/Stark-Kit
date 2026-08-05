import { buildToolDescription, type IToolOptions } from "../../types/tools.js";
import type { AIResponse } from "../provider.js";
import type { CanonicalMessage } from "../../types/message.js";
import z from "zod";

export class ClaudeMapper {
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
        name: tool.name,
        description: buildToolDescription(tool),
        input_schema: safeParameters,
      };
    });
  }

  static toClaudeMessages(history: CanonicalMessage[]): { system?: string; messages: any[] } {
    let system: string | undefined;
    const claudeMessages: any[] = [];

    for (const msg of history) {
      if (msg.role === "system" || msg.role === "developer") {
        system = system ? `${system}\n${msg.content}` : String(msg.content);
        continue;
      }

      if (msg.role === "tool") {
        claudeMessages.push({
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: msg.result.toolCallId,
              // Claude strictly requires tool_result content to be a string
              content: typeof msg.result.content === "string" 
                ? msg.result.content 
                : JSON.stringify(msg.result.content ?? ""),
            },
          ],
        });
        continue;
      }

      if (msg.role === "assistant" && msg.toolCalls?.length) {
        const content: any[] = [];
        if (msg.content) {
          content.push({ type: "text", text: msg.content });
        }
        for (const call of msg.toolCalls) {
          content.push({
            type: "tool_use",
            id: call.id,
            name: call.name,
            input: typeof call.args === "string" ? JSON.parse(call.args) : (call.args ?? {}),
          });
        }
        claudeMessages.push({ role: "assistant", content });
        continue;
      }

      claudeMessages.push({
        role: msg.role === "user" ? "user" : "assistant",
        // Fallback to " " to prevent Anthropic 400 error for empty strings/null
        content: msg.content || " ", 
      });
    }

    return { system, messages: claudeMessages };
  }

  static fromClaudeResponse(response: any): AIResponse {
    let content = "";
    const toolCalls: { id: string; name: string; args: unknown }[] = [];

    for (const block of response.content || []) {
      if (block.type === "text") {
        content += block.text;
      } else if (block.type === "tool_use") {
        toolCalls.push({
          id: block.id,
          name: block.name,
          args: block.input ?? {},
        });
      }
    }

    return {
      content: content || null,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  }
}