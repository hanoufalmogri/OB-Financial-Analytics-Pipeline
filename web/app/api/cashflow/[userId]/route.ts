import { getCashflowTrendForUser } from "@/lib/db";

export async function GET(_request: Request, ctx: RouteContext<"/api/cashflow/[userId]">) {
  const { userId } = await ctx.params;
  const parsed = Number(userId);
  if (!Number.isFinite(parsed)) {
    return Response.json({ error: "Invalid user id." }, { status: 400 });
  }

  const rows = await getCashflowTrendForUser(parsed);
  return Response.json({ rows });
}
