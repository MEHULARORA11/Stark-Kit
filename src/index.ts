import { Agent } from "./agent/agent.js";
import { OpenAIProvider } from "./provider/openai/OpenAIProvider.js";
import {defineTool} from './types/tools.js'
import {z} from 'zod'
import axios from "axios";


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

const provider = new OpenAIProvider();
const agent = new Agent({
    name:"",
    instructions:"",
    provider,
    tools:[weatherTool]
});

const response = await agent.run("What is the weather in Agra and delhi and goa?");
console.log(response)