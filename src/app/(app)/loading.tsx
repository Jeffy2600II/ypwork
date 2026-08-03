// ═══════════════════════════════════════════════════════════════
// YP WORK · Loading State (v1.6 — instant navigation feedback)
// ═══════════════════════════════════════════════════════════════
// Next.js แสดง loading.tsx ทันทีระหว่าง navigation รอ SSR ของหน้าถัดไป
// ผู้ใช้เห็น skeleton ทันที — ไม่ใช่จอค้าง
// ═══════════════════════════════════════════════════════════════

export default function Loading() {
  return (
    <div className="yp-page yp-page-enter">
      <div className="yp-page-header">
        <div
          className="yp-skeleton"
          style={{ width: 80, height: 14, marginBottom: 8 }}
        />
        <div
          className="yp-skeleton"
          style={{ width: 200, height: 28, marginBottom: 8 }}
        />
        <div
          className="yp-skeleton"
          style={{ width: 280, height: 16 }}
        />
      </div>
      <div style={{ display: 'grid', gap: 'var(--yp-space-3)' }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="yp-card">
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div
                className="yp-skeleton"
                style={{ width: 40, height: 40, borderRadius: 10 }}
              />
              <div style={{ flex: 1 }}>
                <div
                  className="yp-skeleton"
                  style={{ width: '60%', height: 16, marginBottom: 6 }}
                />
                <div
                  className="yp-skeleton"
                  style={{ width: '80%', height: 12 }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
