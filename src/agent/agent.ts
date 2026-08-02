// import { z } from "zod";
// import { zodToJsonSchema } from "zod-to-json-schema"; 
// import type { IExecutableTool } from "../types/tools";
// import OpenAI from "openai";
// // 1. Import OpenAI's specific tool type
// import type { ChatCompletionTool } from "openai/resources/chat/completions"; 

// const openai = new OpenAI();

// class MyAgent {
//   private tools: IExecutableTool[];

//   constructor(tools: IExecutableTool[]) {
//     this.tools = tools;
//   }

//   async talkToAI(userMessage: string) {
//     // 2. Explicitly tell TypeScript this array perfectly matches OpenAI's Tool array
//     const toolMenuForTheAI: ChatCompletionTool[] = this.tools.map((tool) => ({
      
//       // 3. Add 'as const' so TS knows this is exactly "function"
//       type: "function" as const, 
      
//       function: {
//         name: tool.name,
//         description: tool.description,
        
//         // 4. Add the 'as' casts to force Zod and OpenAI types to shake hands
//         parameters: zodToJsonSchema(tool.parameters as any) as Record<string, unknown>
//       }
//     }));

//     // 5. No more errors here!
//     const aiResponse = await openai.chat.completions.create({
//       model: "gpt-4", // (Don't forget to pass the model!)
//       messages: [{ role: "user", content: userMessage }],
//       tools: toolMenuForTheAI 
//     });

//     // ... handle the aiResponse ...
//   }
// }

// src/agent/Agent.ts
import type { Provider } from "../provider/provider.js";
import type { IExecutableTool } from "../types/tools.js";
import type {IAgentOptions} from '../types/agent.js'

export class Agent {
  private provider: Provider;
  private tools: IExecutableTool[];
  private history: any[] = []; // (Normally you'd use your memory/History.ts)

  constructor({name,instructions,provider,maxSteps,temperature,tools = []}:IAgentOptions) {
    this.provider = provider;
   tools.length>0? this.tools = tools:this.tools = [];
   this.history.push({
      role: "system",
      content: "You are a helpful AI assistant. You have access to real-time tools. ALWAYS use your provided tools to answer the user's question if a tool is relevant. Never say you don't have real-time capabilities."
    });
  }

  async run(userMessage: string) {
    this.history.push({ role: "user", content: userMessage });

    // ✨ The Infinite Agent Loop
    while (true) {
      console.log("🤖 Thinking...");
      const aiResponse = await this.provider.chat(this.history, this.tools);

      // 1. If the AI replied with text, save it to history so it doesn't lose its train of thought!
      if (aiResponse.content) {
        this.history.push({ role: "assistant", content: aiResponse.content });
      }

      // 2. Are we done? If there are no tool calls, break the loop and return the final answer.
      if (!aiResponse.toolCalls || aiResponse.toolCalls.length === 0) {
        return aiResponse.content;
      }

      // 3. The AI wants to use tools! Let's process ALL of them before asking the AI again.
      for (const toolCall of aiResponse.toolCalls) {
        const tool = this.tools.find(t => t.name === toolCall.name);
        
        if (tool) {
          const rawResult = await tool.execute(toolCall.args);
          
          // Feed the result back into the history privately
          this.history.push({ 
            role: "system", 
            content: `Tool '${tool.name}' returned this data: ${rawResult}` 
          });
        }
      }
      
      // 4. The while loop restarts! 
      // The Agent will automatically call this.provider.chat() again at the top of the loop,
      // but this time, the history contains all the weather data for the cities.
    }
  }
}