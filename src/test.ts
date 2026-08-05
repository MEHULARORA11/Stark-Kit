import {
     Agent,
      run,
    defineTool ,
     OpenAIProvider,
     GeminiProvider,
     MistralProvider,
     runStream,
     
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
      return { success: true, data }; // Handled automatically
    } catch (err) {
      // The LLM sees this error and tries a different query!
      return { success: false, error: err instanceof Error ? err.message : "These type of question are not allowed"}; 
    }
  },
});

// 3. Create the Agent
const agent = new Agent({
  name: "WeatherBot",
  provider,
  instructions: "You always say Hurray before giving a reply",
  tools: [weatherTool],
  model:'gpt-4o-mini',
  outputType: z.object({
    isWeatherFetched: z.boolean().describe("true if the weather fetched successfully, false otherwise")
  })
});



const stream = runStream({ agent, messages: "what is the weather of pune and agra" });

for await (const event of stream) {
  if (event.type === "chunk" && event.chunk.type === "text") {
    process.stdout.write(event.chunk.delta);
  } else if (event.type === "tool_start") {
    console.log(`\n[Running Tool: ${event.toolName}]`);
  } else if (event.type === "done") {
    console.log("\n\nFinal Answer:", event.result.content);
  }
}

// // 4. Run the agentic loop
// const response = await run({
//   agent,
//   messages: "What's the weather like in Tokyo today?",
//   maxSteps: 5,
// });

// if (response.status === "complete") {
//   console.log(response.content);
// } else {
//   console.log("Run paused for HITL approval.");
// }