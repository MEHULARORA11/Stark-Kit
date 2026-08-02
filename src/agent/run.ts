// src/agent/run.ts
import type { Agent } from "./agent.js"; // Check your casing here (agent.js vs Agent.js)
import type { IMessage } from "../types/message.js";

export interface RunOptions {
  agent: Agent;
  messages: IMessage[] | string;
  maxSteps?: number;
}

export interface RunResult {
  content: string | null;
  history: any[]; // Using any[] here to support OpenAI's complex native properties (tool_calls, tool_call_id)
  agent: Agent;
}

export async function run({ agent, messages, maxSteps }: RunOptions): Promise<RunResult> {
  const effectiveMaxSteps = maxSteps ?? agent.maxSteps;

  // Initialize history with the Agent's system instructions + user input
  const history: any[] = [
    { role: "system", content: agent.instructions },
  ];

  if (typeof messages === "string") {
    history.push({ role: "user", content: messages });
  } else {
    history.push(...messages);
  }

  let stepCount = 0;

  while (stepCount < effectiveMaxSteps) {
    stepCount++;
    console.log(`🤖 [${agent.name}] Thinking (Step ${stepCount}/${effectiveMaxSteps})...`);

    const aiResponse = await agent.provider.chat(history, agent.tools);

    // 1. MUST store the exact AI response (rawMessage) so OpenAI remembers the tool_calls it made!
    if (aiResponse.rawMessage) {
      history.push(aiResponse.rawMessage);
    } else if (aiResponse.content) {
      history.push({ role: "assistant", content: aiResponse.content });
    }

    // 2. If no tools were called, return the final result
    if (!aiResponse.toolCalls || aiResponse.toolCalls.length === 0) {
      return {
        content: aiResponse.content,
        history,
        agent,
      };
    }

    // 3. Process tool executions
    for (const toolCall of aiResponse.toolCalls) {
      const tool = agent.tools.find((t) => t.name === toolCall.name);

      if (tool) {
        const rawResult = await tool.execute(toolCall.args);

        history.push({
          role: "tool",
          tool_call_id: toolCall.id, // TS error is gone because we added 'id' to Provider
          content: String(rawResult),
        });
      }
    }
  }

  throw new Error(`Agent '${agent.name}' exceeded maximum execution steps (${effectiveMaxSteps}).`);
}