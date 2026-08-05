import type { CanonicalMessage } from "../../types/message";
import type { IToolOptions } from "../../types/tools";
import type { AIResponse } from "../provider";

export class MistralMapper {
  static toMistralMessages(messages: CanonicalMessage[]): any[] {
    return messages.map((msg) => {
      // 1. Map Tool Results (when passing tool outputs back to the model)
      if (msg.role === "tool") {
        // Handle both direct content or your standard msg.result structure
        const result = (msg as any).result || msg.content;
        return {
          role: "tool",
          name: msg.name || "tool_result",
          content: typeof result === "string" ? result : JSON.stringify(result),
          tool_call_id: (msg as any).result?.toolCallId || (msg as any).toolCallId || "",
        };
      }

      // 2. Map Assistant Tool Calls (when model decides to use a tool)
      if (msg.role === "assistant" && msg.toolCalls?.length) {
        return {
          role: "assistant",
          content: msg.content || "",
          tool_calls: msg.toolCalls.map((call) => ({
            id: call.id,
            type: "function",
            function: {
              name: call.name,
              // Convert your standard 'args' to Mistral's expected 'arguments'
              arguments: typeof call.args === "string" ? call.args : JSON.stringify(call.args),
            },
          })),
        };
      }

      // 3. Map standard System/User/Assistant messages
      return {
        role: msg.role,
        content: typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content),
      };
    });
  }

  static toMistralTools(tools: IToolOptions[]): any[] {
    return tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  static fromMistralResponse(response: any): AIResponse {
    const choice = response.choices?.[0];
    const message = choice?.message;

    // Handle SDK version differences (might be camelCase or snake_case)
    const rawToolCalls = message?.toolCalls || message?.tool_calls || [];

    const toolCalls = rawToolCalls.map((call: any) => ({
      id: call.id,
      name: call.function.name,
      // Standardize back to your 'args' convention for AIResponse
      args: typeof call.function.arguments === "string" 
        ? call.function.arguments 
        : JSON.stringify(call.function.arguments),
    }));

    // Return the flat AIResponse structure
    return {
      role: "assistant",
      content: message?.content || "",
      ...(toolCalls.length > 0 && { toolCalls }),
    } as unknown as AIResponse;
  }
}