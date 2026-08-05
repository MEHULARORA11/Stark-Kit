import type { CanonicalMessage } from "../../types/message";
import type { IToolOptions } from "../../types/tools";
import type { AIResponse } from "../provider"; // Added import

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
                name: msg.name || "tool",
                response: { output: msg.content },
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
              args: JSON.parse(call.args as string), // Use args instead of arguments
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

  // Changed return type from Message to AIResponse
  static fromGeminiResponse(response: any): AIResponse {
    const candidate = response.response.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    let content = "";
    const toolCalls: any[] = [];

    for (const part of parts) {
      if (part.text) {
        content += part.text;
      } else if (part.functionCall) {
        toolCalls.push({
          id: `call_${Math.random().toString(36).substring(2, 9)}`,
          name: part.functionCall.name,
          args: JSON.stringify(part.functionCall.args), // Changed 'arguments' to 'args'
        });
      }
    }

    // Return the flat structure expected by AIResponse
    return {
      role: "assistant",
      content,
      ...(toolCalls.length > 0 && { toolCalls }),
    } as unknown as AIResponse;
  }
}