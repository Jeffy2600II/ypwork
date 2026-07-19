// ═══════════════════════════════════════════════════════════════
// YP WORK · Create Event Loading (v3.4.0 — native skeleton)
// ═══════════════════════════════════════════════════════════════
// Skeleton ที่จำลองรูปร่างของ create-event form จริง
// ทำให้ผู้ใช้เห็นว่าหน้ากำลังโหลด ไม่ใช่จอดำ
// ═══════════════════════════════════════════════════════════════

export default function Loading() {
  return (
    <div className="yp-page yp-page-enter">
      <div className="yp-page-header">
        <div
          className="yp-skeleton"
          style={{ width: 100, height: 14, marginBottom: 8 }}
        />
        <div
          className="yp-skeleton"
          style={{ width: 180, height: 28, marginBottom: 8 }}
        />
        <div
          className="yp-skeleton"
          style={{ width: 240, height: 16 }}
        />
      </div>

      {/* Type picker skeleton */}
      <div className="yp-form-modal__section">
        <div
          className="yp-skeleton"
          style={{ width: 120, height: 16, marginBottom: 12 }}
        />
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
          }}
        >
          {[1, 2].map((i) => (
            <div
              key={i}
              className="yp-card"
              style={{ padding: 16, height: 96 }}
            >
              <div
                className="yp-skeleton"
                style={{ width: 32, height: 32, borderRadius: 8, marginBottom: 8 }}
              />
              <div
                className="yp-skeleton"
                style={{ width: '70%', height: 14, marginBottom: 4 }}
              />
              <div
                className="yp-skeleton"
                style={{ width: '90%', height: 12 }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Fields skeleton */}
      <div className="yp-form-modal__section">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ marginBottom: 16 }}>
            <div
              className="yp-skeleton"
              style={{ width: 100, height: 12, marginBottom: 8 }}
            />
            <div
              className="yp-skeleton"
              style={{ width: '100%', height: 40, borderRadius: 8 }}
            />
          </div>
        ))}
        {/* Color picker skeleton */}
        <div style={{ marginBottom: 16 }}>
          <div
            className="yp-skeleton"
            style={{ width: 80, height: 12, marginBottom: 8 }}
          />
          <div
            style={{
              display: 'flex',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <div
                key={i}
                className="yp-skeleton"
                style={{ width: 32, height: 32, borderRadius: '50%' }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Actions skeleton */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          marginTop: 24,
        }}
      >
        <div
          className="yp-skeleton"
          style={{ width: '100%', height: 44, borderRadius: 10 }}
        />
        <div
          className="yp-skeleton"
          style={{ width: '100%', height: 44, borderRadius: 10 }}
        />
      </div>
    </div>
  );
}
