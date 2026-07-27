import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import {
  getCashflowTrendForUser,
  getSpendingByCategoryForUser,
  type AgentCashflowMonth,
  type AgentCategorySpend,
} from "./db";

// The only two tools the agent may call. Both are scoped to a single
// user_id -- there is no tool that can aggregate or compare across users.
export const AGENT_TOOLS: Tool[] = [
  {
    name: "get_cashflow_trend",
    description:
      "Get a user's month-by-month cashflow trend (total inflow, total outflow, net cashflow) " +
      "across all months of data available for them. Use this to see the overall shape of a " +
      "user's finances over time, or to spot which months had unusual inflow/outflow.",
    input_schema: {
      type: "object",
      properties: {
        user_id: {
          type: "integer",
          description: "The user's numeric ID.",
        },
      },
      required: ["user_id"],
    },
  },
  {
    name: "get_spending_by_category",
    description:
      "Get a user's spending broken down by merchant category (e.g. groceries, restaurants, " +
      "travel) for one specific month, including each category's total spend and its share of " +
      "that month's total spending. Use this to explain what drove a change in a user's spending " +
      "or cashflow in a given month.",
    input_schema: {
      type: "object",
      properties: {
        user_id: {
          type: "integer",
          description: "The user's numeric ID.",
        },
        month: {
          type: "string",
          description: 'The month to inspect, as "YYYY-MM" (e.g. "2017-10").',
        },
      },
      required: ["user_id", "month"],
    },
  },
];

export type AgentToolResult = AgentCashflowMonth[] | AgentCategorySpend[];

// Dispatches a single tool_use block to the underlying db.ts query function.
// Tool arguments come from the model's output, so they're treated as
// untrusted input: shapes are checked here rather than assumed, and every
// downstream query is parameterized (see lib/db.ts).
export async function callAgentTool(name: string, input: unknown): Promise<AgentToolResult> {
  const args = (input ?? {}) as Record<string, unknown>;

  switch (name) {
    case "get_cashflow_trend": {
      const userId = Number(args.user_id);
      if (!Number.isFinite(userId)) {
        throw new Error(`get_cashflow_trend: invalid user_id: ${JSON.stringify(args.user_id)}`);
      }
      return getCashflowTrendForUser(userId);
    }
    case "get_spending_by_category": {
      const userId = Number(args.user_id);
      const month = args.month;
      if (!Number.isFinite(userId)) {
        throw new Error(`get_spending_by_category: invalid user_id: ${JSON.stringify(args.user_id)}`);
      }
      if (typeof month !== "string") {
        throw new Error(`get_spending_by_category: invalid month: ${JSON.stringify(month)}`);
      }
      return getSpendingByCategoryForUser(userId, month);
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
