import { askAgent } from "@/lib/agent";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const question = typeof body?.question === "string" ? body.question.trim() : "";

  if (!question) {
    return Response.json({ error: "Missing 'question' in request body." }, { status: 400 });
  }

  try {
    const { answer, toolCalls } = await askAgent(question);
    return Response.json({ answer, toolCalls });
  } catch (err) {
    console.error("askAgent failed:", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Agent request failed." },
      { status: 500 }
    );
  }
}
