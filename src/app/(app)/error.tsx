'use client';

// ═══════════════════════════════════════════════════════════════
// YP WORK · App Route Group Error Boundary (v1.8.3)
// ═══════════════════════════════════════════════════════════════
// จับ error ที่เกิดในหน้าภายใต้ (app)/ route group — แสดงข้อความที่เข้าใจ
// พร้อมปุ่ม "ลองใหม่" และ "ย้อนกลับ" และแสดง error message จริง
// เพื่อให้ user เห็นสาเหตุและแจ้ง dev ได้
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';
import { AlertTriangle, RotateCcw, ArrowLeft, Home } from 'lucide-react';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[AppError]', error);
  }, [error]);

  const isServerError = !!error?.digest;
  const errorMessage = error?.message || 'Unknown error';
  const errorDigest = error?.digest;

  return (
    <div
      style={{
        fontFamily:
          'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        background: '#F8FAFC',
        color: '#0F172A',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: '100%',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            margin: '0 auto 20px',
            borderRadius: '50%',
            background: '#FEE2E2',
            color: '#DC2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AlertTriangle width={28} height={28} />
        </div>

        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            margin: '0 0 8px',
            color: '#0F172A',
          }}
        >
          เกิดข้อผิดพลาด
        </h1>

        <p
          style={{
            fontSize: 14,
            color: '#64748B',
            margin: '0 0 20px',
            lineHeight: 1.6,
          }}
        >
          {isServerError
            ? 'เซิร์ฟเวอร์มีปัญหา — ลอง reload อีกครั้ง หรือกลับไปหน้าก่อนหน้า'
            : 'หน้านี้โหลดไม่สำเร็จ — อาจเกิดจากปัญหาการเชื่อมต่อหรือข้อมูลไม่ครบ'}
        </p>

        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 12,
            padding: '14px 16px',
            margin: '0 0 20px',
            textAlign: 'left',
            fontSize: 12,
            color: '#475569',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            wordBreak: 'break-word',
            maxHeight: 120,
            overflow: 'auto',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4, color: '#DC2626' }}>
            {error?.name || 'Error'}
          </div>
          {errorMessage}
          {errorDigest ? (
            <div style={{ marginTop: 8, color: '#94A3B8', fontSize: 11 }}>
              Digest: {errorDigest}
            </div>
          ) : null}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={() => reset()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 18px',
              background: '#4F46E5',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <RotateCcw width={16} height={16} />
            ลองใหม่
          </button>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) {
                window.history.back();
              } else {
                window.location.href = '/today';
              }
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 18px',
              background: 'white',
              color: '#475569',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <ArrowLeft width={16} height={16} />
            ย้อนกลับ
          </button>
          <a
            href="/today"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 18px',
              background: 'white',
              color: '#475569',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              textDecoration: 'none',
            }}
          >
            <Home width={16} height={16} />
            หน้าแรก
          </a>
        </div>

        <p
          style={{
            marginTop: 24,
            fontSize: 11,
            color: '#94A3B8',
          }}
        >
          YP Work v3.9.2 · หากปัญหายังเกิด แจ้งผู้ดูแลพร้อมข้อความด้านบน
        </p>
      </div>
    </div>
  );
}
