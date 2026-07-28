export default function Loading() {
  return (
    <>
      <div className="skeleton" style={{ width: 200, height: 12, marginBottom: 10 }} />
      <div className="skeleton" style={{ width: 340, height: 24, marginBottom: 28 }} />
      <div className="skeleton" style={{ height: 260, marginBottom: 24 }} />
      <div className="skeleton" style={{ height: 140 }} />
    </>
  );
}
