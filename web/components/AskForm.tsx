"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ToolCallRecord {
  name: string;
  input: unknown;
}

interface AskResponse {
  answer?: string;
  toolCalls?: ToolCallRecord[];
  error?: string;
}

const EXAMPLE_QUESTION = "Why did user 1664's spending increase in October 2017?";

function describeToolCall(call: ToolCallRecord): string {
  const input = (call.input ?? {}) as Record<string, unknown>;
  if (call.name === "get_cashflow_trend") {
    return `Looked up the cash flow trend for user ${input.user_id}`;
  }
  if (call.name === "get_spending_by_category") {
    return `Looked up ${input.month} spending by category for user ${input.user_id}`;
  }
  return `${call.name}(${JSON.stringify(input)})`;
}

function useElapsedSeconds(active: boolean): number {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      clearInterval(id);
      setSeconds(0);
    };
  }, [active]);

  return active ? seconds : 0;
}

export default function AskForm() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AskResponse | null>(null);
  const requestId = useRef(0);
  const elapsed = useElapsedSeconds(loading);

  async function submit(q: string) {
    const trimmed = q.trim();
    if (!trimmed || loading) return;
    const thisRequest = ++requestId.current;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      const data: AskResponse = await res.json();
      if (requestId.current === thisRequest) setResult(data);
    } catch {
      if (requestId.current === thisRequest) {
        setResult({ error: "Request failed. Check that the dev server and database are reachable." });
      }
    } finally {
      if (requestId.current === thisRequest) setLoading(false);
    }
  }

  return (
    <div className="card">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(question);
        }}
        style={{ display: "flex", gap: 8, marginBottom: 4 }}
      >
        <input
          className="input"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={EXAMPLE_QUESTION}
        />
        <button type="submit" disabled={loading} className="btn">
          {loading ? "Asking…" : "Ask"}
        </button>
      </form>
      <button
        type="button"
        className="btn-link"
        onClick={() => {
          setQuestion(EXAMPLE_QUESTION);
          submit(EXAMPLE_QUESTION);
        }}
      >
        Try the example question
      </button>

      {loading && (
        <p className="stat-sub" style={{ marginTop: 16 }}>
          Calling tools and reasoning through the data. This can take up to a minute.
          {elapsed > 0 ? ` (${elapsed}s)` : ""}
        </p>
      )}

      {result?.error && (
        <p className="text-attention" style={{ marginTop: 16 }}>
          {result.error}
        </p>
      )}

      {result?.answer && (
        <div style={{ marginTop: 20 }}>
          <p className="stat-label">Answer</p>
          <div className="markdown-answer">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.answer}</ReactMarkdown>
          </div>

          {result.toolCalls && result.toolCalls.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <p className="stat-label">Tools called</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                {result.toolCalls.map((call, i) => (
                  <div key={i} className="tool-call-row">
                    <span className="badge">{call.name}</span> {describeToolCall(call)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
