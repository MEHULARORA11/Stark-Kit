// src/agent/run.ts
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

// ═══════════════════════════════════════════════════════════════════════
//  Public Types
// ═══════════════════════════════════════════════════════════════════════

export interface RunOptions {
  agent: Agent;
  messages: IMessage[] | string;
  maxSteps?: number;
  /** Override the Agent's default model/temperature for this run only. */
  model?: string;
  temperature?: number;
}

export interface RunResult {
  status: "complete";
  content: string | null;
  history: CanonicalMessage[];
  /** The agent that produced the final answer (may differ from input after handoffs). */
  agent: Agent;
}

// ── HITL Types ────────────────────────────────────────────────────────

export interface PendingToolCall {
  toolCallId: string;
  toolName: string;
  args: unknown;
}

export interface HITLPause {
  status: "requires_action";
  pendingToolCalls: PendingToolCall[];
  history: CanonicalMessage[];
  agent: Agent;
  /** @internal — opaque state needed by resumeRun */
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

/** Runtime type-guard for distinguishing HITL pauses from completed runs. */
export function isHITLPause(result: RunResultOrPause): result is HITLPause {
  return result.status === "requires_action";
}

export type HITLDecision =
  | { action: "approve" }
  | { action: "reject"; reason?: string }
  | { action: "modify"; modifiedArgs: Record<string, unknown> };

// ── Streaming Types ───────────────────────────────────────────────────

export type RunStreamEvent =
  | { type: "chunk"; chunk: StreamChunk }
  | { type: "tool_start"; toolName: string; args: unknown }
  | { type: "tool_end"; toolName: string; result: string; isError: boolean }
  | { type: "handoff"; fromAgent: string; toAgent: string }
  | { type: "step_complete"; stepNumber: number }
  | { type: "hitl_pause"; pause: HITLPause }
  | { type: "done"; result: RunResult };

// ═══════════════════════════════════════════════════════════════════════
//  run() — Standard Agentic Loop
// ═══════════════════════════════════════════════════════════════════════

export async function run({
  agent,
  messages,
  maxSteps,
  model,
  temperature,
}: RunOptions): Promise<RunResultOrPause> {
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
  const chatOptions: ChatOptions = {
    model: model ?? agent.model,
    temperature: temperature ?? agent.temperature,
  };

  return _runLoop(agent, history, 0, effectiveMaxSteps, chatOptions);
}

// ═══════════════════════════════════════════════════════════════════════
//  resumeRun() — Continue from an HITL Pause
// ═══════════════════════════════════════════════════════════════════════

export async function resumeRun(
  pause: HITLPause,
  decisions: Record<string, HITLDecision>
): Promise<RunResultOrPause> {
  const { history, agent, _remainingToolCalls, _processedResults, _stepCount, _maxSteps, _chatOptions } = pause;

  // Process each pending tool call according to the user's decision
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

    // Determine effective args
    const effectiveArgs =
      decision.action === "modify" ? decision.modifiedArgs : toolCall.args;

    // Find and execute the tool
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

  // Push all tool results into history
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

  // Continue the agentic loop
  return _runLoop(agent, history, _stepCount, _maxSteps, _chatOptions);
}

// ═══════════════════════════════════════════════════════════════════════
//  runStream() — Streaming Agentic Loop
// ═══════════════════════════════════════════════════════════════════════

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

  if (typeof messages === "string") {
    history.push({ role: "user", content: messages });
  } else {
    history.push(...messages);
  }

  const chatOptions: ChatOptions = {
    model: model ?? agent.model,
    temperature: temperature ?? agent.temperature,
  };

  let activeAgent = agent;
  let stepCount = 0;

  while (stepCount < effectiveMaxSteps) {
    stepCount++;
    console.log(`🤖 [${activeAgent.name}] Thinking (Step ${stepCount}/${effectiveMaxSteps})...`);

    // ── beforeChat guardrail ──
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

    // ── Call the provider (streaming or fallback) ──
    let aiResponse: AIResponse;

    if (activeAgent.provider.chatStream) {
      // Streaming path — yield chunks to the caller in real-time
      let assembledResponse: AIResponse | undefined;
      const stream = activeAgent.provider.chatStream(effectiveHistory, activeAgent.tools, chatOptions);

      for await (const chunk of stream) {
        yield { type: "chunk", chunk };
        if (chunk.type === "done") {
          assembledResponse = chunk.response;
        }
      }

      aiResponse = assembledResponse ?? { content: null };
    } else {
      // Non-streaming fallback
      aiResponse = await activeAgent.provider.chat(effectiveHistory, activeAgent.tools, chatOptions);
    }

    // Store the canonical assistant turn
    history.push({
      role: "assistant",
      content: aiResponse.content,
      toolCalls: aiResponse.toolCalls,
    });

    // No tools called -> final answer
    if (!aiResponse.toolCalls || aiResponse.toolCalls.length === 0) {
      const result: RunResult = {
        status: "complete",
        content: aiResponse.content,
        history,
        agent: activeAgent,
      };
      yield { type: "done", result };
      return;
    }

    // ── Process tool calls ──
    const hitlPending: ToolCall[] = [];
    const processedResults: Array<{
      toolCallId: string;
      toolName: string;
      content: string;
      isError: boolean;
    }> = [];
    let handoffOccurred = false;

    for (const toolCall of aiResponse.toolCalls) {
      const tool = activeAgent.tools.find((t) => t.name === toolCall.name);

      // HITL check
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

      // Handoff detection
      if (execResult.rawResult && isHandoffResult(execResult.rawResult)) {
        const previousName = activeAgent.name;
        activeAgent = execResult.rawResult.targetAgent;

        processedResults.push({
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          content: execResult.content,
          isError: false,
        });

        // Push all results so far into history
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

        // Inject system context for the new agent
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

    // If handoff occurred, skip HITL/result-push — loop continues with new agent
    if (handoffOccurred) {
      yield { type: "step_complete", stepNumber: stepCount };
      continue;
    }

    // HITL pause
    if (hitlPending.length > 0) {
      // Push the non-HITL results we already processed
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

    // Push results into history
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

// ═══════════════════════════════════════════════════════════════════════
//  _runLoop() — Internal Agentic Loop (shared by run + resumeRun)
// ═══════════════════════════════════════════════════════════════════════

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

    // ── beforeChat guardrail ──────────────────────────────────────
    let effectiveHistory: CanonicalMessage[] = history;
    if (activeAgent.hooks.beforeChat) {
      try {
        const modified = await activeAgent.hooks.beforeChat([...history]);
        if (modified) effectiveHistory = modified;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        // Inject a system correction so the LLM sees the guardrail error
        history.push({
          role: "system",
          content: `[Guardrail Error] beforeChat hook threw: ${errMsg}`,
        });
        // Skip this LLM call and let the loop retry with the error context
        continue;
      }
    }

    // ── Call the provider ─────────────────────────────────────────
    const aiResponse = await activeAgent.provider.chat(
      effectiveHistory,
      activeAgent.tools,
      chatOptions
    );

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
        status: "complete",
        content: aiResponse.content,
        history,
        agent: activeAgent,
      };
    }

    // ── Process tool executions ───────────────────────────────────
    // Separate HITL tools (need approval) from auto-execute tools.
    const hitlPending: ToolCall[] = [];
    const processedResults: Array<{
      toolCallId: string;
      toolName: string;
      content: string;
      isError: boolean;
    }> = [];

    for (const toolCall of aiResponse.toolCalls) {
      const tool = activeAgent.tools.find((t) => t.name === toolCall.name);

      // ── HITL check ──
      if (tool?.requiresApproval) {
        hitlPending.push(toolCall);
        continue; // Don't execute — will pause below
      }

      // ── Missing tool ──
      if (!tool) {
        processedResults.push({
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          content: `Tool '${toolCall.name}' is not registered on this agent.`,
          isError: true,
        });
        continue;
      }

      // ── beforeTool guardrail ──
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
          continue; // Skip this tool
        }
      }

      // ── Execute the tool ──
      let content: string;
      let isError = false;

      try {
        const rawResult = await tool.execute(effectiveArgs);

        // Handoff detection — before we stringify
        if (isHandoffResult(rawResult)) {
          const previousName = activeAgent.name;
          activeAgent = rawResult.targetAgent;

          content = `[Handoff] Control transferred to agent: "${activeAgent.name}".`;
          isError = false;

          // Inject a system context swap so the LLM knows the new instructions
          processedResults.push({
            toolCallId: toolCall.id,
            toolName: toolCall.name,
            content,
            isError,
          });

          // Push all results so far into history
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
          processedResults.length = 0; // Clear — already pushed

          // Inject system context for the new agent
          history.push({
            role: "system",
            content: `[System] Control has been transferred from "${previousName}" to "${activeAgent.name}". New instructions: ${activeAgent.instructions}`,
          });

          console.log(`🔄 [Handoff] ${previousName} → ${activeAgent.name}`);

          // Break out of tool processing — the outer while loop will
          // continue with the new activeAgent
          break;
        }

        // Standardized ToolResult handling
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
          // Legacy raw-value path (backward compatible)
          content = typeof rawResult === "string" ? rawResult : JSON.stringify(rawResult);
        }
      } catch (err) {
        content = `Tool '${toolCall.name}' threw an error: ${
          err instanceof Error ? err.message : String(err)
        }`;
        isError = true;
      }

      // ── afterTool guardrail ──
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

    // ── HITL pause ────────────────────────────────────────────────
    if (hitlPending.length > 0) {
      // Push the non-HITL results we already processed
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
        _processedResults: [], // Already pushed above
        _stepCount: stepCount,
        _maxSteps: maxSteps,
        _chatOptions: chatOptions,
      };
    }

    // ── Push remaining tool results into history ──────────────────
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

// ═══════════════════════════════════════════════════════════════════════
//  _executeTool() — Shared tool execution with guardrails
// ═══════════════════════════════════════════════════════════════════════

async function _executeTool(
  tool: IToolOptions,
  args: unknown,
  toolName: string,
  agent: Agent
): Promise<{ content: string; isError: boolean; rawResult?: unknown }> {
  // ── beforeTool guardrail ──
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

    // Handoff detection
    if (isHandoffResult(rawResult)) {
      return {
        content: `[Handoff] Control transferred to agent: "${rawResult.targetAgent.name}".`,
        isError: false,
        rawResult,
      };
    }

    // Standardized ToolResult handling
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

  // ── afterTool guardrail ──
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