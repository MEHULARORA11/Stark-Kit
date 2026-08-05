import type { CanonicalMessage } from "../../types/message.js";
import type { IToolOptions } from "../../types/tools.js";
import type { AIResponse } from "../provider.js";

export class GeminiMapper {
  static toGeminiContents(messages: CanonicalMessage[]): { systemInstruction?: string; contents: any[] } {
    let systemInstruction: string | undefined;
    const contents: any[] = [];

    for (const msg of messages) {
      if (msg.role === "system") {
        systemInstruction = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
        continue;
      }

      if (msg.role === "tool") {
        contents.push({
          role: "user",
          parts: [
            {
              functionResponse: {
                // Gemini requires a name here. We fallback to toolCallId if name is missing in msg
                name: (msg as any).name || msg.result.toolCallId || "tool",
                response: { output: msg.result.content },
              },
            },
          ],
        });
        continue;
      }

      if (msg.role === "assistant" && msg.toolCalls?.length) {
        const parts: any[] = [];
        if (msg.content) parts.push({ text: msg.content });
        for (const call of msg.toolCalls) {
          parts.push({
            functionCall: {
              name: call.name,
              args: typeof call.args === "string" ? JSON.parse(call.args) : (call.args ?? {}),
            },
          });
        }
        contents.push({ role: "model", parts });
        continue;
      }

      contents.push({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      });
    }

    return { systemInstruction, contents };
  }

  static toGeminiTools(tools: IToolOptions[]): any[] {
    if (!tools || tools.length === 0) return [];
    return [
      {
        functionDeclarations: tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        })),
      },
    ];
  }

  static fromGeminiResponse(response: any): AIResponse {
    const candidate = response.response.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    let content = "";
    const toolCalls: { id: string; name: string; args: unknown }[] = [];

    for (const part of parts) {
      if (part.text) {
        content += part.text;
      } else if (part.functionCall) {
        toolCalls.push({
          id: `call_${Math.random().toString(36).substring(2, 9)}`, // Gemini doesn't generate IDs, mock one
          name: part.functionCall.name,
          args: part.functionCall.args || {}, // Gemini passes args as an object natively
        });
      }
    }

    return {
      content: content || null,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  }
}