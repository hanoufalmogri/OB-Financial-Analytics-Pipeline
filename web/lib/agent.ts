import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, TextBlock, ToolUseBlock } from "@anthropic-ai/sdk/resources/messages";
import { AGENT_TOOLS, callAgentTool } from "./tools";

// This loop's shape -- plan, call a tool, look at the result, decide whether
// that's enough or another tool call is needed, then answer -- takes
// inspiration from how agentic research tools like Dexter structure their
// reasoning. It's built independently here, against this project's own two
// tools and Neon data, not forked from Dexter or any other codebase.

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a financial insight assistant for an open banking analytics product.
You answer one user's question about their own finances using two tools:
- get_cashflow_trend(user_id): month-by-month inflow/outflow/net cashflow for a user
- get_spending_by_category(user_id, month): that user's spend by merchant category for one month

Call whichever tools you need -- in sequence, reasoning about each result before deciding
whether another call is needed -- then give a clear, specific answer grounded only in the
numbers the tools returned. Reference concrete figures (dollar amounts, category names,
percentages) rather than vague generalities. If the tool results don't support a confident
answer, say so plainly instead of guessing.`;

const MAX_TOOL_ITERATIONS = 5;

export interface ToolCallRecord {
  name: string;
  input: unknown;
}

export interface AgentAnswer {
  answer: string;
  toolCalls: ToolCallRecord[];
}

function extractText(content: Array<TextBlock | ToolUseBlock | unknown>): string {
  return content
    .filter((block): block is TextBlock => (block as TextBlock).type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

export async function askAgent(question: string): Promise<AgentAnswer> {
  const messages: MessageParam[] = [{ role: "user", content: question }];
  const toolCalls: ToolCallRecord[] = [];

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: AGENT_TOOLS,
      messages,
    });

    const toolUseBlocks = response.content.filter(
      (block): block is ToolUseBlock => block.type === "tool_use"
    );

    // No tool calls left to make -- this is the final answer. Validate that
    // it actually finished (not cut off by max_tokens) and says something.
    if (toolUseBlocks.length === 0) {
      if (response.stop_reason === "max_tokens") {
        throw new Error("Agent's final answer was truncated (hit max_tokens). Try raising max_tokens.");
      }
      const answer = extractText(response.content);
      if (!answer) {
        throw new Error("Agent returned an empty final answer.");
      }
      return { answer, toolCalls };
    }

    messages.push({ role: "assistant", content: response.content });

    const toolResults = await Promise.all(
      toolUseBlocks.map(async (block) => {
        toolCalls.push({ name: block.name, input: block.input });
        try {
          const result = await callAgentTool(block.name, block.input);
          return {
            type: "tool_result" as const,
            tool_use_id: block.id,
            content: JSON.stringify(result),
          };
        } catch (err) {
          return {
            type: "tool_result" as const,
            tool_use_id: block.id,
            content: err instanceof Error ? err.message : String(err),
            is_error: true,
          };
        }
      })
    );

    messages.push({ role: "user", content: toolResults });
  }

  throw new Error(`Agent did not reach a final answer within ${MAX_TOOL_ITERATIONS} tool-call rounds.`);
}
