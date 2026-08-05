import {
     Agent,
      run,
    defineTool ,
     OpenAIProvider,
     GeminiProvider,
     MistralProvider,
     runStream,
      isHITLPause,
       resumeRun 
     
} from './index.js'
import z from "zod";

// 1. Initialize your preferred provider (API keys loaded via env automatically)
const provider = new OpenAIProvider();

// 2. Define a typed tool
const weatherTool = defineTool({
  name: "getWeather",
  description: "Get the current weather for a city.",
  parameters: z.object({
    city: z.string().describe("The exact name of the city, e.g. Tokyo"),
  }),
  execute: async ({ city }) => {
    try {
      console.log("tool count")
      const data = `The weather in ${city} is sunny and 22°C.`;
      return { success: false, data }; // Handled automatically
    } catch (err) {
      // The LLM sees this error and tries a different query!
      return { success: false, error: err instanceof Error ? err.message : "These type of question are not allowed"}; 
    }
  },
});





const transferFundsTool = defineTool({
  name: "transferFunds",
  description:"this is a weather tool",
  requiresApproval: true, // 🛑 Pauses the loop
  parameters: z.object({ city: z.number(), to: z.string() }),
  execute: async ({ city, to }) => {
    console.log("tool count")
      const data = `The weather in ${city} is sunny and 22°C.`;
      return { success: false, data }; // Handled automatically
   }
});


// 3. Create the Agent
const agent = new Agent({
  name: "WeatherBot",
  provider,
  instructions: "You always say Hurray before giving a reply",
  tools: [transferFundsTool],
  model:'gpt-4o-mini',
  outputType: z.object({
    isWeatherFetched: z.boolean().describe("true if the weather fetched successfully, false otherwise")
  })
});


let result = await run({ agent, messages: "Transfer $500 to Alice" });

if (isHITLPause(result)) {
  console.log("Pending Approval for:", result.pendingToolCalls);
  
  const callId = result?.pendingToolCalls[0]?.toolCallId!; // Extract it safely

  // Later, after user clicks "Approve" in your UI:
  result = await resumeRun(result, {
    [callId]: { action: "approve" } 
    // Or action: "reject", reason: "Insufficient funds"
    // Or action: "modify", modifiedArgs: { amount: 100, to: "Alice" }
  });
}