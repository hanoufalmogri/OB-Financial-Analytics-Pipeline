import AskForm from "@/components/AskForm";

export const metadata = { title: "Ask | OB Financial Analytics" };

export default function AskPage() {
  return (
    <>
      <p className="eyebrow">Ask</p>
      <h1>Ask a question about a user&apos;s finances</h1>
      <p className="page-desc">
        Ask about one user&apos;s cash flow or spending. The agent picks which of two tools to call,
        looks at what comes back, and answers using only that. It doesn&apos;t know anything about
        your data that these two tools don&apos;t already tell it.
      </p>

      <AskForm />
    </>
  );
}
