import OpenAI from "openai";
import type { Provider } from "../provider.js";
import type { IExecutableTool } from "../../types/tools.js";
import { OpenAIMapper } from "./OpenAIMapper.js";
import {config} from '../../utils/config.js'

export class OpenAIProvider implements Provider {
  name = "openai";
  private client = new OpenAI({
    apiKey:config.OPENAI_API_KEY
  });

  async chat(messages: any[], tools: IExecutableTool[]): Promise<any> {
    const openaiTools = OpenAIMapper.mapTools(tools);

    const response = await this.client.chat.completions.create({
      model: "gpt-4o", // Ensure you are using gpt-4o!
      messages: messages,
      tools: openaiTools.length > 0 ? openaiTools : undefined,
    });

    const choice = response.choices[0]?.message;

    // We now capture the `id` so we can give it back to OpenAI later
    const parsedToolCalls: { id: string, name: string; args: any }[] = [];
    
    if (choice?.tool_calls) {
      for (const tc of choice.tool_calls) {
        if (tc.type === "function") {
          parsedToolCalls.push({
            id: tc.id, // 👉 CAPTURING THE ID!
            name: tc.function.name,
            args: JSON.parse(tc.function.arguments)
          });
        }
      }
    }

    return {
      content: choice?.content || null,
      toolCalls: parsedToolCalls.length > 0 ? parsedToolCalls : undefined,
      rawMessage: choice // 👉 We return the exact assistant message so the Agent can save it
    };
  }
}