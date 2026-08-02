// src/index.ts
import  { Agent } from "./agent/agent.js";
import  { run } from "./agent/run.js";


// import  Providers
import  { OpenAIProvider } from "./provider/openai/OpenAIProvider.js";

// import  Types
import  type { IAgentOptions } from "./types/agent.js";
import  type { IMessage } from "./types/message.js";
import  type { IExecutableTool } from "./types/tools.js";
import z from "zod";
import axios from "axios";
import { defineTool } from "./agent/tool.js";

const provider = new OpenAIProvider

const weatherTool = defineTool({
  name: "weatherTool",
  description: "Get the weather. You MUST provide the 'city' name.", 
  parameters: z.object({
    city: z.string().describe("The exact name of the city, e.g. Agra")
  }),
  // ...
    execute:async ({city}) => {
         const url = `https://wttr.in/${city.toLowerCase()}?format=%C+%t`
            const response = await axios.get(url,{responseType:'text'})
            return JSON.stringify({city,weatherInfo:response.data})
    }
})

const agent = new Agent({
    name:"weather agent",
    provider,
    instructions:"",
    tools:[weatherTool]
})

const response = await run({
    agent,
    messages:"what is the weather of agra and delhi , pune and goa? ?",
    maxSteps:10
})

console.log(response.content)