import AskForm from "@/components/AskForm";

export default function AskPage() {
  return (
    <>
      <p className="eyebrow">Ask</p>
      <h1>Ask a question about a user&apos;s finances</h1>
      <p className="page-desc">
        Ask about one user&apos;s cashflow or spending. The agent decides which of two tools to
        call &mdash; cashflow trend or spending by category &mdash; looks at the result, and
        answers using only what those tools return.
      </p>

      <AskForm />
    </>
  );
}
