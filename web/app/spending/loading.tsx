export default function Loading() {
  return (
    <>
      <div className="skeleton" style={{ width: 160, height: 12, marginBottom: 10 }} />
      <div className="skeleton" style={{ width: 280, height: 24, marginBottom: 28 }} />
      <div className="skeleton" style={{ height: 400 }} />
    </>
  );
}
