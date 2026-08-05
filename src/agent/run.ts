// src/agent/run.ts
import type { Agent } from "./agent.js";
import type { CanonicalMessage, IMessage } from "../types/message.js";
import {HARNESS_PROMPT} from '../utils/prompt.js'

export interface RunOptions {
  agent: Agent;
  messages: IMessage[] | string;
  maxSteps?: number;
  /** Override the Agent's default model/temperature for this run only. */
  model?: string;
  temperature?: number;
}

export interface RunResult {
  content: string | null;
  history: CanonicalMessage[];
  agent: Agent;
}

export async function run({ agent, messages, maxSteps, model, temperature }: RunOptions): Promise<RunResult> {
  const effectiveMaxSteps = maxSteps ?? agent.maxSteps;

  // Initialize history with the Agent's system instructions + user input.
  // History is 100% canonical from here on -- no provider-native shapes
  // ever get pushed into it. Providers only ever see it via chat().
  const history: CanonicalMessage[] = [
    { role: "system", content: agent.instructions },
  ];

  if (typeof messages === "string") {
    history.push({ role: "user", content: messages });
  } else {
    history.push(...messages);
  }

  // Generic generation knobs -- run() has no idea which provider is
  // underneath, it just forwards whatever the caller/Agent configured.
  const chatOptions = {
    model: model ?? agent.model,
    temperature: temperature ?? agent.temperature,
  };

  let stepCount = 0;

  while (stepCount < effectiveMaxSteps) {
    stepCount++;
    console.log(`🤖 [${agent.name}] Thinking (Step ${stepCount}/${effectiveMaxSteps})...`);

    const aiResponse = await agent.provider.chat(history, agent.tools, chatOptions);

    // Store the canonical assistant turn (content + tool calls, if any).
    // No rawMessage hack needed: the provider's own mapper can rebuild
    // its native format from this on the next call.
    history.push({
      role: "assistant",
      content: aiResponse.content,
      toolCalls: aiResponse.toolCalls,
    });

    // No tools called -> final answer, we're done.
    if (!aiResponse.toolCalls || aiResponse.toolCalls.length === 0) {
      return {
        content: aiResponse.content,
        history,
        agent,
      };
    }

    // Process tool executions. A missing tool or a throwing tool no
    // longer crashes the run -- the failure is reported back into
    // history so the model can see it and try to recover.
    for (const toolCall of aiResponse.toolCalls) {
      const tool = agent.tools.find((t) => t.name === toolCall.name);

      let content: string;
      let isError = false;

      if (!tool) {
        content = `Tool '${toolCall.name}' is not registered on this agent.`;
        isError = true;
      } else {
        try {
          const rawResult = await tool.execute(toolCall.args);
          content = String(rawResult);
        } catch (err) {
          content = `Tool '${toolCall.name}' threw an error: ${err instanceof Error ? err.message : String(err)}`;
          isError = true;
        }
      }

      history.push({
        role: "tool",
        result: {
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          content,
          isError,
        },
      });
    }
  }

  throw new Error(`Agent '${agent.name}' exceeded maximum execution steps (${effectiveMaxSteps}).`);
}