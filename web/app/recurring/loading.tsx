export default function Loading() {
  return (
    <>
      <div className="skeleton" style={{ width: 180, height: 12, marginBottom: 10 }} />
      <div className="skeleton" style={{ width: 220, height: 24, marginBottom: 28 }} />
      <div className="skeleton" style={{ height: 60, marginBottom: 24 }} />
      <div className="skeleton" style={{ height: 320 }} />
    </>
  );
}
