export default function Loading() {
  return (
    <>
      <div className="skeleton" style={{ width: 140, height: 12, marginBottom: 10 }} />
      <div className="skeleton" style={{ width: 320, height: 24, marginBottom: 28 }} />
      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        <div className="skeleton" style={{ height: 84 }} />
        <div className="skeleton" style={{ height: 84 }} />
        <div className="skeleton" style={{ height: 84 }} />
      </div>
      <div className="skeleton" style={{ height: 340 }} />
    </>
  );
}
