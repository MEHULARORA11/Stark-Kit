import type { IToolOptions } from "../../types/tools.js";
import type { AIResponse } from "../provider.js";
import type { CanonicalMessage } from "../../types/message.js";
import z from "zod";

export class GeminiMapper {
  static mapTools(tools: IToolOptions[]): any[] {
    if (!tools || tools.length === 0) return [];
    
    const functionDeclarations = tools.map((tool) => {
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
        description: tool.description,
        parameters: safeParameters,
      };
    });

    return [{ functionDeclarations }];
  }

  static toGeminiContents(history: CanonicalMessage[]): { systemInstruction?: string; contents: any[] } {
    let systemInstruction: string | undefined;
    const contents: any[] = [];

    for (const msg of history) {
      if (msg.role === "system" || msg.role === "developer") {
        systemInstruction = systemInstruction ? `${systemInstruction}\n${msg.content}` : String(msg.content);
        continue;
      }

      if (msg.role === "tool") {
        contents.push({
          role: "user",
          parts: [
            {
              functionResponse: {
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

  static fromGeminiResponse(response: any): AIResponse {
    const candidate = response.response?.candidates?.[0] ?? response.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    let content = "";
    const toolCalls: { id: string; name: string; args: unknown }[] = [];

    for (const part of parts) {
      if (part.text) {
        content += part.text;
      } else if (part.functionCall) {
        toolCalls.push({
          id: `call_${Math.random().toString(36).substring(2, 9)}`,
          name: part.functionCall.name,
          args: part.functionCall.args ?? {},
        });
      }
    }

    return {
      content: content || null,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  }
}