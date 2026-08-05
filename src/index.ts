import  { Agent } from "./agent/agent.js";
import  { run } from "./agent/run.js";
import  { OpenAIProvider } from "./provider/openai/OpenAIProvider.js";
import z from "zod";
import axios from "axios";
import { defineTool } from "./agent/tool.js";

const provider = new OpenAIProvider()


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
    instructions:"you always reply in anger mode amd provide the accurate weather details by providing city names to the accurate tool ",
    tools:[weatherTool]
})

const response = await run({
    agent,
    messages:"what is the weather of agra and delhi , pune and goa ?",
    maxSteps:10
})

console.log(response.content)
console.log(provider.name)