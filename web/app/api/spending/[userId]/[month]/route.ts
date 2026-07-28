import { getSpendingByCategoryForUser } from "@/lib/db";

export async function GET(_request: Request, ctx: RouteContext<"/api/spending/[userId]/[month]">) {
  const { userId, month } = await ctx.params;
  const parsed = Number(userId);
  if (!Number.isFinite(parsed)) {
    return Response.json({ error: "Invalid user id." }, { status: 400 });
  }

  try {
    const rows = await getSpendingByCategoryForUser(parsed, month);
    return Response.json({ rows });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Invalid month." },
      { status: 400 }
    );
  }
}
