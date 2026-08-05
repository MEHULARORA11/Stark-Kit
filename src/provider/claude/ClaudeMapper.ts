import  type { CanonicalMessage }from "../../types/message";
import type { IToolOptions } from "../../types/tools";
import type { AIResponse } from "../provider";

export class ClaudeMapper {
  static toClaudeMessages(messages: CanonicalMessage[]): { system?: string; messages: any[] } {
    let system: string | undefined;
    const claudeMessages: any[] = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        system = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
        continue;
      }

      if (msg.role === "tool") {
        claudeMessages.push({
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: msg.result.toolCallId,
              content: typeof msg.result.content === "string" ?msg.result.content : JSON.stringify(msg.result.),
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
            input: JSON.parse(call.args as string),
          });
        }
        claudeMessages.push({ role: "assistant", content });
        continue;
      }

      claudeMessages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      });
    }

    return { system, messages: claudeMessages };
  }

  static toClaudeTools(tools: IToolOptions[]): any[] {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.parameters,
    }));
  }

 static fromClaudeResponse(response: any): AIResponse {
    let content = "";
    const toolCalls: any[] = [];

    for (const block of response.content) {
      if (block.type === "text") {
        content += block.text;
      } else if (block.type === "tool_use") {
        toolCalls.push({
          id: block.id,
          name: block.name,
          // Using 'args' here since your toClaudeMessages uses call.args
          args: JSON.stringify(block.input), 
        });
      }
    }

    // Cast to unknown first if TypeScript still complains about strict structural typing,
    // but the flat structure is what AIResponse requires based on your error logs.
    return {
      role: "assistant",
      content,
      ...(toolCalls.length > 0 && { toolCalls }),
    } as unknown as AIResponse;
  }
}