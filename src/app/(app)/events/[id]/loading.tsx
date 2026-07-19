// v1.6 — loading state สำหรับ /events/[id]
export default function Loading() {
  return (
    <div className="yp-page yp-page-enter">
      <div
        className="yp-skeleton"
        style={{ width: 100, height: 16, marginBottom: 12, borderRadius: 8 }}
      />
      <div
        className="yp-skeleton"
        style={{ width: '70%', height: 32, marginBottom: 16, borderRadius: 8 }}
      />
      <div
        className="yp-skeleton"
        style={{ width: '50%', height: 14, marginBottom: 24, borderRadius: 6 }}
      />
      <div style={{ display: 'grid', gap: 'var(--yp-space-3)' }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="yp-card" style={{ padding: 12 }}>
            <div
              className="yp-skeleton"
              style={{ width: '70%', height: 16, marginBottom: 8, borderRadius: 6 }}
            />
            <div
              className="yp-skeleton"
              style={{ width: '40%', height: 12, borderRadius: 6 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
