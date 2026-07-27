"use client";

import { useState } from "react";

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

export default function AskForm() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AskResponse | null>(null);

  async function submit(q: string) {
    const trimmed = q.trim();
    if (!trimmed || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      const data: AskResponse = await res.json();
      setResult(data);
    } catch {
      setResult({ error: "Request failed. Check that the dev server and database are reachable." });
    } finally {
      setLoading(false);
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
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={EXAMPLE_QUESTION}
          style={{
            flex: 1,
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            padding: "10px 12px",
            borderRadius: 6,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            color: "var(--ink)",
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 14,
            padding: "10px 18px",
            borderRadius: 6,
            border: "1px solid var(--accent-border)",
            background: loading ? "var(--accent-soft)" : "var(--accent)",
            color: loading ? "var(--accent)" : "#fff",
            cursor: loading ? "default" : "pointer",
          }}
        >
          {loading ? "Asking..." : "Ask"}
        </button>
      </form>
      <button
        type="button"
        onClick={() => {
          setQuestion(EXAMPLE_QUESTION);
          submit(EXAMPLE_QUESTION);
        }}
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          color: "var(--muted)",
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          textDecoration: "underline",
        }}
      >
        Try the example question
      </button>

      {result?.error && (
        <p style={{ color: "var(--accent)", marginTop: 16 }}>{result.error}</p>
      )}

      {result?.answer && (
        <div style={{ marginTop: 20 }}>
          <p className="stat-label">Answer</p>
          <p style={{ marginTop: 6, lineHeight: 1.6 }}>{result.answer}</p>

          {result.toolCalls && result.toolCalls.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <p className="stat-label">Tools called</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                {result.toolCalls.map((call, i) => (
                  <div
                    key={i}
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 12.5,
                      padding: "8px 10px",
                      borderRadius: 6,
                      border: "1px solid var(--border)",
                      background: "var(--bg)",
                    }}
                  >
                    <span className="badge">{call.name}</span>{" "}
                    {JSON.stringify(call.input)}
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
