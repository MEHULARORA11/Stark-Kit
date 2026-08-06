import type { Agent } from "./agent.js";
import type {
  CanonicalMessage,
  IMessage,
  ToolCall,
} from "../types/message.js";
import type { ChatOptions, StreamChunk, AIResponse } from "../provider/provider.js";
import type { IToolOptions } from "../types/tools.js";
import { isToolResult } from "../types/tools.js";
import { isHandoffResult } from "./handoff.js";
import { buildOutputTypePrompt } from "../utils/prompt.js";
import z from "zod";

// Options for running the agent loop.
export interface RunOptions {
  agent: Agent;
  messages: IMessage[] | string;
  maxSteps?: number;
  model?: string;
  temperature?: number;
}

// Represents the successful completion of an agent run.
export interface RunResult {
  status: "complete";
  content: string | null;
  history: CanonicalMessage[];
  agent: Agent;
  finalOutput?: any;
}

// Represents a tool call that is pending human approval.
export interface PendingToolCall {
  toolCallId: string;
  toolName: string;
  args: unknown;
}

// Represents a paused run state awaiting human-in-the-loop action.
export interface HITLPause {
  status: "requires_action";
  pendingToolCalls: PendingToolCall[];
  history: CanonicalMessage[];
  agent: Agent;
  _remainingToolCalls: ToolCall[];
  _processedResults: Array<{
    toolCallId: string;
    toolName: string;
    content: string;
    isError: boolean;
  }>;
  _stepCount: number;
  _maxSteps: number;
  _chatOptions: ChatOptions;
}

export type RunResultOrPause = RunResult | HITLPause;

// Determines if a run result is currently in a paused state.
export function isHITLPause(result: RunResultOrPause): result is HITLPause {
  return result.status === "requires_action";
}

export type HITLDecision =
  | { action: "approve" }
  | { action: "reject"; reason?: string }
  | { action: "modify"; modifiedArgs: Record<string, unknown> };

export type RunStreamEvent =
  | { type: "chunk"; chunk: StreamChunk }
  | { type: "tool_start"; toolName: string; args: unknown }
  | { type: "tool_end"; toolName: string; result: string; isError: boolean }
  | { type: "handoff"; fromAgent: string; toAgent: string }
  | { type: "step_complete", stepNumber: number }
  | { type: "hitl_pause"; pause: HITLPause }
  | { type: "done"; result: RunResult };

// Executes the agent run loop.
export async function run({
  agent,
  messages,
  maxSteps,
  model,
  temperature,
}: RunOptions): Promise<RunResultOrPause> {
  const effectiveMaxSteps = maxSteps ?? agent.maxSteps;

  const history: CanonicalMessage[] = [
    { role: "system", content: agent.instructions },
  ];

  if (agent.outputType) {
    const jsonSchema = z.toJSONSchema(agent.outputType as any) as Record<string, unknown>;
    history.push({
      role: "system",
      content: buildOutputTypePrompt(jsonSchema),
    });
  }

  if (typeof messages === "string") {
    history.push({ role: "user", content: messages });
  } else {
    history.push(...messages);
  }

  const chatOptions: ChatOptions = {
    model: model ?? agent.model,
    temperature: temperature ?? agent.temperature,
    toolChoice: agent.outputType ? "required" : undefined,
  };

  return _runLoop(agent, history, 0, effectiveMaxSteps, chatOptions);
}

// Resumes an agent run loop that was paused for human-in-the-loop validation.
export async function resumeRun(
  pause: HITLPause,
  decisions: Record<string, HITLDecision>
): Promise<RunResultOrPause> {
  const { history, agent, _remainingToolCalls, _processedResults, _stepCount, _maxSteps, _chatOptions } = pause;

  for (const toolCall of _remainingToolCalls) {
    const decision = decisions[toolCall.id];

    if (!decision || decision.action === "reject") {
      const reason = decision?.action === "reject" && decision.reason
        ? decision.reason
        : "Tool call was rejected by the user.";

      _processedResults.push({
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        content: reason,
        isError: true,
      });
      continue;
    }

    const effectiveArgs =
      decision.action === "modify" ? decision.modifiedArgs : toolCall.args;

    const tool = agent.tools.find((t) => t.name === toolCall.name);
    if (!tool) {
      _processedResults.push({
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        content: `Tool '${toolCall.name}' is not registered on this agent.`,
        isError: true,
      });
      continue;
    }

    const { content, isError } = await _executeTool(tool, effectiveArgs, toolCall.name, agent);
    _processedResults.push({
      toolCallId: toolCall.id,
      toolName: toolCall.name,
      content,
      isError,
    });
  }

  for (const result of _processedResults) {
    history.push({
      role: "tool",
      result: {
        toolCallId: result.toolCallId,
        toolName: result.toolName,
        content: result.content,
        isError: result.isError,
      },
    });
  }

  return _runLoop(agent, history, _stepCount, _maxSteps, _chatOptions);
}

// Runs the agentic loop returning an async stream generator of run events.
export async function* runStream({
  agent,
  messages,
  maxSteps,
  model,
  temperature,
}: RunOptions): AsyncGenerator<RunStreamEvent, void, unknown> {
  const effectiveMaxSteps = maxSteps ?? agent.maxSteps;

  const history: CanonicalMessage[] = [
    { role: "system", content: agent.instructions },
  ];

  if (agent.outputType) {
    const jsonSchema = z.toJSONSchema(agent.outputType as any) as Record<string, unknown>;
    history.push({
      role: "system",
      content: buildOutputTypePrompt(jsonSchema),
    });
  }

  if (typeof messages === "string") {
    history.push({ role: "user", content: messages });
  } else {
    history.push(...messages);
  }

  const chatOptions: ChatOptions = {
    model: model ?? agent.model,
    temperature: temperature ?? agent.temperature,
    toolChoice: agent.outputType ? "required" : undefined,
  };

  let activeAgent = agent;
  let stepCount = 0;

  while (stepCount < effectiveMaxSteps) {
    stepCount++;
    console.log(`🤖 [${activeAgent.name}] Thinking (Step ${stepCount}/${effectiveMaxSteps})...`);

    let effectiveHistory = history;
    if (activeAgent.hooks.beforeChat) {
      try {
        const modified = await activeAgent.hooks.beforeChat([...history]);
        if (modified) effectiveHistory = modified;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        history.push({ role: "system", content: `[Guardrail Error] ${errMsg}` });
        continue;
      }
    }

    let aiResponse: AIResponse;
    const effectiveTools = _getEffectiveTools(activeAgent);

    if (activeAgent.provider.chatStream) {
      let assembledResponse: AIResponse | undefined;
      const stream = activeAgent.provider.chatStream(effectiveHistory, effectiveTools, chatOptions);

      for await (const chunk of stream) {
        yield { type: "chunk", chunk };
        if (chunk.type === "done") {
          assembledResponse = chunk.response;
        }
      }

      aiResponse = assembledResponse ?? { content: null };
    } else {
      aiResponse = await activeAgent.provider.chat(effectiveHistory, effectiveTools, chatOptions);
    }

    history.push({
      role: "assistant",
      content: aiResponse.content,
      toolCalls: aiResponse.toolCalls,
    });

    if (!aiResponse.toolCalls || aiResponse.toolCalls.length === 0) {
      if (activeAgent.outputType) {
        history.push({
          role: "system",
          content:
            "[Output Enforcement] Your response was plain text, but this agent requires a structured JSON output. " +
            "You MUST call the 'submit_final_output' tool with the required fields — plain-text responses are NOT accepted. " +
            "Call 'submit_final_output' now with all required fields populated.",
        });
        yield { type: "step_complete", stepNumber: stepCount };
        continue;
      }

      const result: RunResult = {
        status: "complete",
        content: aiResponse.content,
        history,
        agent: activeAgent,
      };
      yield { type: "done", result };
      return;
    }

    const hitlPending: ToolCall[] = [];
    const processedResults: Array<{
      toolCallId: string;
      toolName: string;
      content: string;
      isError: boolean;
    }> = [];
    let handoffOccurred = false;

    for (const toolCall of aiResponse.toolCalls) {
      if (activeAgent.outputType && toolCall.name === "submit_final_output") {
        const parsed = activeAgent.outputType.safeParse(toolCall.args);
        if (parsed.success) {
          const finalResult: RunResult = {
            status: "complete",
            content: JSON.stringify(parsed.data),
            history,
            agent: activeAgent,
            finalOutput: parsed.data,
          };
          yield { type: "tool_start", toolName: toolCall.name, args: toolCall.args };
          yield { type: "tool_end", toolName: toolCall.name, result: "Final output submitted.", isError: false };
          yield { type: "done", result: finalResult };
          return;
        } else {
          yield { type: "tool_start", toolName: toolCall.name, args: toolCall.args };
          const errMsg = `Validation Failed for final output: ${parsed.error.message}`;
          processedResults.push({
            toolCallId: toolCall.id,
            toolName: toolCall.name,
            content: errMsg,
            isError: true,
          });
          yield { type: "tool_end", toolName: toolCall.name, result: errMsg, isError: true };
          continue;
        }
      }

      const tool = _getEffectiveTools(activeAgent).find((t) => t.name === toolCall.name);

      if (tool?.requiresApproval) {
        hitlPending.push(toolCall);
        continue;
      }

      yield { type: "tool_start", toolName: toolCall.name, args: toolCall.args };

      if (!tool) {
        const errContent = `Tool '${toolCall.name}' is not registered on this agent.`;
        processedResults.push({ toolCallId: toolCall.id, toolName: toolCall.name, content: errContent, isError: true });
        yield { type: "tool_end", toolName: toolCall.name, result: errContent, isError: true };
        continue;
      }

      const execResult = await _executeTool(tool, toolCall.args, toolCall.name, activeAgent);

      if (execResult.rawResult && isHandoffResult(execResult.rawResult)) {
        const previousName = activeAgent.name;
        activeAgent = execResult.rawResult.targetAgent;

        processedResults.push({
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          content: execResult.content,
          isError: false,
        });

        for (const result of processedResults) {
          history.push({
            role: "tool",
            result: {
              toolCallId: result.toolCallId,
              toolName: result.toolName,
              content: result.content,
              isError: result.isError,
            },
          });
        }
        processedResults.length = 0;

        history.push({
          role: "system",
          content: `[System] Control has been transferred from "${previousName}" to "${activeAgent.name}". New instructions: ${activeAgent.instructions}`,
        });

        yield { type: "handoff", fromAgent: previousName, toAgent: activeAgent.name };
        yield { type: "tool_end", toolName: toolCall.name, result: execResult.content, isError: false };

        console.log(`🔄 [Handoff] ${previousName} → ${activeAgent.name}`);
        handoffOccurred = true;
        break;
      }

      processedResults.push({ toolCallId: toolCall.id, toolName: toolCall.name, content: execResult.content, isError: execResult.isError });
      yield { type: "tool_end", toolName: toolCall.name, result: execResult.content, isError: execResult.isError };
    }

    if (handoffOccurred) {
      yield { type: "step_complete", stepNumber: stepCount };
      continue;
    }

    if (hitlPending.length > 0) {
      for (const result of processedResults) {
        history.push({
          role: "tool",
          result: {
            toolCallId: result.toolCallId,
            toolName: result.toolName,
            content: result.content,
            isError: result.isError,
          },
        });
      }

      const pause: HITLPause = {
        status: "requires_action",
        pendingToolCalls: hitlPending.map((tc) => ({
          toolCallId: tc.id,
          toolName: tc.name,
          args: tc.args,
        })),
        history,
        agent: activeAgent,
        _remainingToolCalls: hitlPending,
        _processedResults: [],
        _stepCount: stepCount,
        _maxSteps: effectiveMaxSteps,
        _chatOptions: chatOptions,
      };
      yield { type: "hitl_pause", pause };
      return;
    }

    for (const result of processedResults) {
      history.push({
        role: "tool",
        result: {
          toolCallId: result.toolCallId,
          toolName: result.toolName,
          content: result.content,
          isError: result.isError,
        },
      });
    }

    yield { type: "step_complete", stepNumber: stepCount };
  }

  throw new Error(`Agent '${activeAgent.name}' exceeded maximum execution steps (${effectiveMaxSteps}).`);
}

// Internal loop executing consecutive agent reasoning and action execution.
async function _runLoop(
  initialAgent: Agent,
  history: CanonicalMessage[],
  startStep: number,
  maxSteps: number,
  chatOptions: ChatOptions
): Promise<RunResultOrPause> {
  let activeAgent = initialAgent;
  let stepCount = startStep;

  while (stepCount < maxSteps) {
    stepCount++;
    console.log(`🤖 [${activeAgent.name}] Thinking (Step ${stepCount}/${maxSteps})...`);

    let effectiveHistory: CanonicalMessage[] = history;
    if (activeAgent.hooks.beforeChat) {
      try {
        const modified = await activeAgent.hooks.beforeChat([...history]);
        if (modified) effectiveHistory = modified;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        history.push({
          role: "system",
          content: `[Guardrail Error] beforeChat hook threw: ${errMsg}`,
        });
        continue;
      }
    }

    const effectiveTools = _getEffectiveTools(activeAgent);
    const aiResponse = await activeAgent.provider.chat(
      effectiveHistory,
      effectiveTools,
      chatOptions
    );

    history.push({
      role: "assistant",
      content: aiResponse.content,
      toolCalls: aiResponse.toolCalls,
    });

    if (!aiResponse.toolCalls || aiResponse.toolCalls.length === 0) {
      if (activeAgent.outputType) {
        history.push({
          role: "system",
          content:
            "[Output Enforcement] Your response was plain text, but this agent requires a structured JSON output. " +
            "You MUST call the 'submit_final_output' tool with the required fields — plain-text responses are NOT accepted. " +
            "Call 'submit_final_output' now with all required fields populated.",
        });
        continue;
      }

      return {
        status: "complete",
        content: aiResponse.content,
        history,
        agent: activeAgent,
      };
    }

    const hitlPending: ToolCall[] = [];
    const processedResults: Array<{
      toolCallId: string;
      toolName: string;
      content: string;
      isError: boolean;
    }> = [];

    for (const toolCall of aiResponse.toolCalls) {
      if (activeAgent.outputType && toolCall.name === "submit_final_output") {
        const parsed = activeAgent.outputType.safeParse(toolCall.args);
        if (parsed.success) {
          return {
            status: "complete",
            content: JSON.stringify(parsed.data),
            history,
            agent: activeAgent,
            finalOutput: parsed.data,
          };
        } else {
          processedResults.push({
            toolCallId: toolCall.id,
            toolName: toolCall.name,
            content: `Validation Failed for final output: ${parsed.error.message}`,
            isError: true,
          });
          continue;
        }
      }

      const tool = _getEffectiveTools(activeAgent).find((t) => t.name === toolCall.name);

      if (tool?.requiresApproval) {
        hitlPending.push(toolCall);
        continue;
      }

      if (!tool) {
        processedResults.push({
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          content: `Tool '${toolCall.name}' is not registered on this agent.`,
          isError: true,
        });
        continue;
      }

      let effectiveArgs = toolCall.args;
      if (activeAgent.hooks.beforeTool) {
        try {
          const modified = await activeAgent.hooks.beforeTool(toolCall.name, toolCall.args);
          if (modified !== undefined && modified !== null) effectiveArgs = modified;
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          processedResults.push({
            toolCallId: toolCall.id,
            toolName: toolCall.name,
            content: `[Guardrail Error] beforeTool hook blocked execution: ${errMsg}`,
            isError: true,
          });
          continue;
        }
      }

      let content: string;
      let isError = false;

      try {
        const rawResult = await tool.execute(effectiveArgs);

        if (isHandoffResult(rawResult)) {
          const previousName = activeAgent.name;
          activeAgent = rawResult.targetAgent;

          content = `[Handoff] Control transferred to agent: "${activeAgent.name}".`;
          isError = false;

          processedResults.push({
            toolCallId: toolCall.id,
            toolName: toolCall.name,
            content,
            isError,
          });

          for (const result of processedResults) {
            history.push({
              role: "tool",
              result: {
                toolCallId: result.toolCallId,
                toolName: result.toolName,
                content: result.content,
                isError: result.isError,
              },
            });
          }
          processedResults.length = 0;

          history.push({
            role: "system",
            content: `[System] Control has been transferred from "${previousName}" to "${activeAgent.name}". New instructions: ${activeAgent.instructions}`,
          });

          console.log(`🔄 [Handoff] ${previousName} → ${activeAgent.name}`);
          break;
        }

        if (isToolResult(rawResult)) {
          if (rawResult.success) {
            content =
              rawResult.data !== undefined
                ? typeof rawResult.data === "string"
                  ? rawResult.data
                  : JSON.stringify(rawResult.data)
                : "Tool executed successfully.";
          } else {
            content = rawResult.error ?? "Tool returned an unspecified error.";
            isError = true;
          }
        } else {
          content = typeof rawResult === "string" ? rawResult : JSON.stringify(rawResult);
        }
      } catch (err) {
        content = `Tool '${toolCall.name}' threw an error: ${
          err instanceof Error ? err.message : String(err)
        }`;
        isError = true;
      }

      if (activeAgent.hooks.afterTool) {
        try {
          const modified = await activeAgent.hooks.afterTool(toolCall.name, content, isError);
          if (modified !== undefined && modified !== null) content = modified;
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          content = `[Guardrail Error] afterTool hook threw: ${errMsg}`;
          isError = true;
        }
      }

      processedResults.push({
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        content,
        isError,
      });
    }

    if (hitlPending.length > 0) {
      for (const result of processedResults) {
        history.push({
          role: "tool",
          result: {
            toolCallId: result.toolCallId,
            toolName: result.toolName,
            content: result.content,
            isError: result.isError,
          },
        });
      }

      return {
        status: "requires_action",
        pendingToolCalls: hitlPending.map((tc) => ({
          toolCallId: tc.id,
          toolName: tc.name,
          args: tc.args,
        })),
        history,
        agent: activeAgent,
        _remainingToolCalls: hitlPending,
        _processedResults: [],
        _stepCount: stepCount,
        _maxSteps: maxSteps,
        _chatOptions: chatOptions,
      };
    }

    for (const result of processedResults) {
      history.push({
        role: "tool",
        result: {
          toolCallId: result.toolCallId,
          toolName: result.toolName,
          content: result.content,
          isError: result.isError,
        },
      });
    }
  }

  throw new Error(
    `Agent '${initialAgent.name}' exceeded maximum execution steps (${maxSteps}).`
  );
}

// Executes an individual tool with prepended and postposed guardrail checks.
async function _executeTool(
  tool: IToolOptions,
  args: unknown,
  toolName: string,
  agent: Agent
): Promise<{ content: string; isError: boolean; rawResult?: unknown }> {
  let effectiveArgs = args;
  if (agent.hooks.beforeTool) {
    try {
      const modified = await agent.hooks.beforeTool(toolName, args);
      if (modified !== undefined && modified !== null) effectiveArgs = modified;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return {
        content: `[Guardrail Error] beforeTool hook blocked execution: ${errMsg}`,
        isError: true,
      };
    }
  }

  let content: string;
  let isError = false;
  let rawResult: unknown;

  try {
    rawResult = await tool.execute(effectiveArgs);

    if (isHandoffResult(rawResult)) {
      return {
        content: `[Handoff] Control transferred to agent: "${rawResult.targetAgent.name}".`,
        isError: false,
        rawResult,
      };
    }

    if (isToolResult(rawResult)) {
      if (rawResult.success) {
        content =
          rawResult.data !== undefined
            ? typeof rawResult.data === "string"
              ? rawResult.data
              : JSON.stringify(rawResult.data)
            : "Tool executed successfully.";
      } else {
        content = rawResult.error ?? "Tool returned an unspecified error.";
        isError = true;
      }
    } else {
      content = typeof rawResult === "string" ? rawResult : JSON.stringify(rawResult);
    }
  } catch (err) {
    content = `Tool '${toolName}' threw an error: ${
      err instanceof Error ? err.message : String(err)
    }`;
    isError = true;
  }

  if (agent.hooks.afterTool) {
    try {
      const modified = await agent.hooks.afterTool(toolName, content, isError);
      if (modified !== undefined && modified !== null) content = modified;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      content = `[Guardrail Error] afterTool hook threw: ${errMsg}`;
      isError = true;
    }
  }

  return { content, isError, rawResult };
}

// Retrieves all active tools for the agent, including structured output tool injections.
function _getEffectiveTools(agent: Agent): IToolOptions[] {
  const tools = [...agent.tools];
  if (agent.outputType) {
    tools.push({
      name: "submit_final_output",
      description:
        "REQUIRED — Submit the final structured output of your task. " +
        "You MUST call this tool to finish. " +
        "Responding with plain text instead of calling this tool is FORBIDDEN and will be rejected. " +
        "This is the ONLY valid way to complete the task when structured output is required.",
      parameters: agent.outputType,
      execute: async (args) => args,
    });
  }
  return tools;
}