import { buildToolDescription, type IToolOptions } from "../../types/tools.js";
import type { AIResponse } from "../provider.js";
import type { CanonicalMessage } from "../../types/message.js";
import z from "zod";

export class GeminiMapper {
  static mapTools(tools: IToolOptions[]): any[] {
    if (!tools || tools.length === 0) return [];
    
    const functionDeclarations = tools.map((tool) => {
      const jsonSchema = z.toJSONSchema(tool.parameters as any) as any;

      const stripGeminiIncompatibilities = (schema: any) => {
        if (!schema || typeof schema !== "object") return;
        
        if ("$schema" in schema) delete schema.$schema;
        if ("additionalProperties" in schema) delete schema.additionalProperties;
        
        for (const key in schema) {
          if (typeof schema[key] === "object") {
            stripGeminiIncompatibilities(schema[key]);
          }
        }
      };

      stripGeminiIncompatibilities(jsonSchema);

      const safeParameters =
        jsonSchema.type === "object"
          ? jsonSchema
          : { type: "object", properties: {} };

      return {
        name: tool.name,
        description: buildToolDescription(tool),
        parameters: safeParameters,
      };
    });

    return [{ functionDeclarations }];
  }

  static toGeminiContents(history: CanonicalMessage[]): { systemInstruction?: string; contents: any[] } {
    let systemInstruction: string | undefined;
    const contents: any[] = [];

    for (let i = 0; i < history.length; i++) {
      const msg = history[i];
      if (!msg) continue;

      switch (msg.role) {
        case "system":
        case "developer": {
          systemInstruction = systemInstruction ? `${systemInstruction}\n${msg.content}` : String(msg.content);
          break;
        }

        case "tool": {
          let responseData;
          if (typeof msg.result.content === "string") {
            try {
              responseData = JSON.parse(msg.result.content);
            } catch {
              responseData = { output: msg.result.content };
            }
          } else {
            responseData = msg.result.content;
          }

          let functionName = (msg as any).name || (msg.result as any).name;
          if (!functionName && msg.result?.toolCallId) {
            for (let j = i - 1; j >= 0; j--) {
              const prevMsg = history[j];
              if (prevMsg?.role === "assistant" && prevMsg.toolCalls) {
                const call = prevMsg.toolCalls.find(tc => tc.id === msg.result.toolCallId);
                if (call) {
                  functionName = call.name;
                  break;
                }
              }
            }
          }
          
          functionName = functionName || "tool";

          contents.push({
            role: "user", 
            parts: [
              {
                functionResponse: {
                  name: functionName,
                  response: responseData,
                },
              },
            ],
          });
          break;
        }

        case "assistant": {
          const parts: any[] = [];
          if (msg.content) parts.push({ text: msg.content });
          
          if (msg.toolCalls && msg.toolCalls.length > 0) {
            for (const call of msg.toolCalls) {
              let parsedArgs: any = {};
              if (typeof call.args === "string") {
                try {
                  parsedArgs = JSON.parse(call.args);
                } catch {
                  parsedArgs = {};
                }
              } else {
                parsedArgs = { ...(call.args ?? {}) };
              }

              // Extract the hidden thought signature we injected earlier
              const ts = parsedArgs._thoughtSignature;
              if (ts) {
                delete parsedArgs._thoughtSignature; // Remove it so it doesn't get passed to the actual tool
              }

              const partToPush: any = {
                functionCall: {
                  name: call.name,
                  args: parsedArgs,
                },
              };

              // Gemini 3.x strictly enforces that we echo the signature back exactly where we found it
              if (ts) {
                partToPush.thoughtSignature = ts;
                partToPush.thought_signature = ts;
              }

              parts.push(partToPush);
            }
          }

          if (parts.length === 0) {
            parts.push({ text: " " });
          }

          contents.push({ role: "model", parts });
          break;
        }

        case "user": {
          contents.push({
            role: "user",
            parts: [{ text: msg.content || " " }], 
          });
          break;
        }
      }
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
        let args: any = part.functionCall.args;
        if (typeof args === "string") {
          try { args = JSON.parse(args); } catch { args = {}; }
        } else {
          args = args ? { ...args } : {};
        }

        // Gemini 3.x passes down a thought_signature. We MUST save it to survive the framework loop.
        // We safely inject it into the args payload.
        const ts = part.thoughtSignature || part.thought_signature;
        if (ts) {
          args._thoughtSignature = ts;
        }

        toolCalls.push({
          id: part.functionCall.id || `call_${Math.random().toString(36).substring(2, 9)}`,
          name: part.functionCall.name,
          args: args,
        });
      }
    }

    return {
      content: content || null,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    };
  }
}