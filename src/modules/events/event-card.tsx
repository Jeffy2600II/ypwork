// Path:    src/modules/events/event-card.tsx
// Purpose: การ์ดสรุปรายการ 1 ชิ้น ใช้แสดงในหน้ารายการ (EventsListView) และหน้าอื่น
//          ที่ต้องแสดงรายการ/กลุ่มรายการแบบย่อ
// Used by: EventsListView (src/modules/events/events-list-view.tsx)
// ═══════════════════════════════════════════════════════════════
// YP WORK · EventCard (shared component — ใช้ใน list, day)
// ═══════════════════════════════════════════════════════════════
// ★ v3.10.0 รอบที่ 29: อ้างอิงจาก "วันที่เริ่ม" แทน "วันกำหนดส่ง" เพื่อให้ผู้ใช้
//   เห็นว่า "จะเริ่มทำตอนไหน" ก่อน แล้วค่อยเห็น "กำหนดส่งเมื่อไหร่" — ลดความ
//   กดดันจากการเห็นแค่ deadline แต่ไม่เห็นจุดเริ่มต้น ถ้ามี start_date จะแสดง
//   เป็น meta หลัก และแสดง deadline เป็น meta รอง (ถ้าต่างจาก start_date)
//
// ★ v3.10.0 รอบที่ 32: เอา "รายการย่อย preview" (รอบที่ 26) ออก
//   ปัญหาที่ผู้ใช้แจ้ง: การแสดงรายการย่อยเป็นแถวๆ ข้างในการ์ด ทำให้ดูเหมือน
//   "การ์ดซ้อนการ์ด" สับสนว่าทำไมถึงมีอะไรโผล่มาตรงนี้ ทั้งที่กดอะไรตรงนั้น
//   ไม่ได้เลย (ทั้งการ์ดเป็น Link เดียวไปหน้ารายละเอียด) — ผู้ใช้เสนอว่าไม่ต้อง
//   แสดงรายการย่อยก็ได้ ให้กดเข้าไปดูข้างในแทน
//   → แทนที่ด้วย "สรุปสถานะ" บรรทัดเดียว (breakdown chips) เช่น
//     "รอเริ่ม 2 · กำลังทำ 1 · เสร็จ 3" ซึ่งเป็นข้อความสรุป ไม่ใช่รายการที่
//     ดูเหมือนกดได้ทีละอัน ลด "รายการย่อยลอยเป็นการ์ดในการ์ด" ทั้งหมด
//   → เพิ่มลูกศร (chevron) มุมขวาบนให้เห็นชัดว่าทั้งการ์ดกดเข้าไปดูรายละเอียดได้
//
// ★ r51 (aerospace refactor): event.date อาจเป็น null สำหรับ group type
//   - ถ้าไม่มีทั้ง start_date และ date → แสดง "ไม่มีกำหนดส่ง" แทน date badge
//   - ใช้ getEffectiveStartDate() จาก event-date.ts (single source of truth)
//   - ป้องกัน null pointer exception ในทุก branch ที่เคยใช้ event.date ตรง ๆ
// ═══════════════════════════════════════════════════════════════

import * as React from 'react';
import Link from 'next/link';
import { Layers, Flag, ChevronRight } from 'lucide-react';
import type { YPEvent, TaskStatus } from '@/lib/types';
import {
  relativeDay,
  eventProgress,
  resolveEventStatus,
  statusLabel,
  statusChipClass,
  getLocalTodayStr,
} from '@/lib/utils/date';
// ★ r51: ใช้ shared helpers จาก event-date.ts (single source of truth)
import { getEffectiveStartDate } from '@/lib/utils/event-date';

// ★ v3.10.0 รอบที่ 32: ลำดับแสดงผล breakdown — รอเริ่ม → กำลังทำ → เสร็จ
//   (ลำดับตามขั้นตอนงานจริง ให้อ่านแล้วเข้าใจ flow ง่ายกว่าเรียงตามตัวอักษร)
const STATUS_BREAKDOWN_ORDER: TaskStatus[] = ['todo', 'ongoing', 'done'];

export interface EventCardProps {
  event: YPEvent;
  /** optional extra meta parts ที่จะแสดงต่อท้าย (เช่น "ฉัน 2 task") */
  extraMeta?: string[];
}

// ★ v3.10.0 รอบที่ 26: Badge สำหรับแสดงวันนี้/พรุ่งนี้/เลยกำหนด
//   ★ v3.10.0 รอบที่ 29: ถ้ามี start_date → badge อ้างอิงจาก start_date
//     แทน deadline (date) เพื่อสื่อ "จะเริ่มตอนไหน" ไม่ใช่ "เลยกำหนดส่ง"
//   ★ r51: ถ้า date เป็น null (group ที่ไม่มี deadline) → อ้างอิงจาก start_date เท่านั้น
function DateBadge({ date }: { date: string | null }) {
  if (!date) return null;
  const todayStr = getLocalTodayStr();
  const diffDays = Math.round(
    (new Date(date + 'T00:00:00').getTime() - new Date(todayStr + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) {
    return <span className="yp-event-card__date-badge yp-event-card__date-badge--today">วันนี้</span>;
  }
  if (diffDays === 1) {
    return <span className="yp-event-card__date-badge yp-event-card__date-badge--tomorrow">พรุ่งนี้</span>;
  }
  if (diffDays < 0) {
    return <span className="yp-event-card__date-badge yp-event-card__date-badge--overdue">เลยกำหนด</span>;
  }
  return null;
}

export function EventCard({ event, extraMeta = [] }: EventCardProps) {
  const accent = event.color || '#4F46E5';
  const isGroup = event.type === 'group';
  const totalTasks = event.tasks?.length || 0;
  const doneTasks = event.tasks?.filter((t) => t.status === 'done').length || 0;
  const progress = eventProgress(event.tasks || []);
  const displayStatus = resolveEventStatus(event);

  // ★ r51: ใช้ getEffectiveStartDate() จาก event-date.ts (single source of truth)
  //   ถ้าไม่มีทั้ง start_date และ date → null (group ที่ไม่มีกำหนดการเลย)
  const effectiveStart = getEffectiveStartDate(event);
  const hasStartDate = !!event.start_date;
  const hasDeadline = !!event.date;
  // ★ r51: badge อ้างอิงจาก effectiveStart — ถ้าไม่มีเลย → ไม่แสดง badge
  const referenceDateForBadge = effectiveStart;

  // ★ r51: meta หลัก — เปลี่ยนไปใช้ effectiveStart ที่รองรับ null
  //   - ถ้ามี effectiveStart → แสดง "เริ่ม ..." หรือ date ปกติ
  //   - ถ้าไม่มีเลย → แสดง "ไม่มีกำหนดส่ง" (group ที่ไม่มีกำหนดการ)
  //   ★ r67: ลบ "เริ่ม" prefix ออกจาก meta — ทำให้ meta line สะอาดขึ้น
  //     เพราะมี DateBadge (วันนี้/พรุ่งนี้/เลยกำหนด) บอก context อยู่แล้ว
  //     และ meta อื่นๆ (time, location) ก็ไม่มี prefix ด้วย เพื่อให้สม่ำเสมอ
  const metaParts: string[] = [];
  if (effectiveStart) {
    metaParts.push(relativeDay(effectiveStart));
    if (event.time) metaParts.push(event.time);
  } else {
    // ★ r51: group ที่ไม่มีทั้ง start_date และ date → แสดง "ไม่มีกำหนดส่ง"
    metaParts.push('ไม่มีกำหนดส่ง');
  }
  if (event.location) metaParts.push(event.location);
  for (const m of extraMeta) metaParts.push(m);

  // ★ v3.10.0 รอบที่ 32: สรุปจำนวนรายการย่อยตามสถานะ (breakdown) แทนการ preview
  //   ทีละรายการ (รอบที่ 26 เดิม) — เหตุผล: ผู้ใช้แจ้งว่าการโชว์รายการย่อย
  //   เป็นแถวๆ ในการ์ดทำให้ดูเหมือนกดได้ทั้งที่ไม่ได้ (ทั้งการ์ดเป็น Link เดียว)
  //   → นับจำนวนต่อสถานะแค่บรรทัดเดียว ให้ "เห็นภาพรวม" โดยไม่ต้องมีรายการย่อย
  //   ลอยเป็นก้อนๆ ให้สับสน ลำดับ: รอเริ่ม → กำลังทำ → เสร็จ (ตามลำดับงาน)
  const statusBreakdown = React.useMemo(() => {
    if (!isGroup || totalTasks === 0) return [];
    const counts: Record<TaskStatus, number> = { todo: 0, ongoing: 0, done: 0 };
    for (const t of event.tasks || []) counts[t.status] += 1;
    return STATUS_BREAKDOWN_ORDER
      .map((status) => ({ status, count: counts[status] }))
      .filter((entry) => entry.count > 0);
  }, [event.tasks, isGroup, totalTasks]);

  return (
    <Link
      href={`/events/${event.id}`}
      className="yp-event-card"
      style={{ ['--accent' as string]: accent }}
      aria-label={`รายการ: ${event.title}`}
    >
      <div className="yp-event-card__head">
        <div
          className="yp-event-card__icon"
          aria-hidden="true"
        >
          {isGroup ? <Layers strokeWidth={2} /> : <Flag strokeWidth={2} />}
        </div>

        <div className="yp-event-card__main">
          <div className="yp-event-card__title">
            {event.title}
            {/* ★ v3.10.0 รอบที่ 26: Date Badge
                ★ v3.10.0 รอบที่ 29: ถ้ามี start_date → badge อ้างอิงจาก start_date
                ★ r51: ถ้าไม่มี effectiveStart เลย → ไม่แสดง badge */}
            <DateBadge date={referenceDateForBadge} />
          </div>
          <div className="yp-event-card__meta">{metaParts.join(' · ')}</div>
          {/* ★ v3.10.0 รอบที่ 29: ถ้ามี start_date และต่างจาก deadline
              → แสดงบรรทัด meta รอง "กำหนดส่ง ..." เพื่อให้เห็นทั้งจุดเริ่มและจุดสิ้นสุด
              ถ้า start_date เท่ากับ deadline → ไม่ต้องแสดงซ้ำ
              ★ r51: ถ้าไม่มี deadline (group) → ไม่แสดงบรรทัดนี้
              ★ r67: คง "กำหนดส่ง" prefix ไว้ เพราะเป็น meta รอง ต้องบอกชัดว่า
                บรรทัดนี้คือ deadline ไม่ใช่ start date */}
          {hasStartDate && hasDeadline && event.start_date !== event.date ? (
            <div className="yp-event-card__meta yp-event-card__meta--secondary">
              กำหนดส่ง {relativeDay(event.date!)}
            </div>
          ) : null}
        </div>

        <span className={`yp-chip ${statusChipClass(displayStatus)}`}>
          <span className="yp-chip-dot" aria-hidden="true" />
          {statusLabel(displayStatus)}
        </span>

        {/* ★ v3.10.0 รอบที่ 32: ลูกศรบอกว่า "ทั้งการ์ดกดเข้าไปดูรายละเอียดได้"
            เพิ่มเข้ามาเพราะก่อนหน้านี้ไม่มีสัญลักษณ์บอกเลยว่าการ์ดกดได้ */}
        <ChevronRight
          className="yp-event-card__chevron"
          width={16}
          height={16}
          aria-hidden="true"
        />
      </div>

      {/* ★ v3.10.0 รอบที่ 32: สรุปสถานะรายการย่อยบรรทัดเดียว (breakdown)
          แทนที่การ preview รายการย่อยทีละอัน (รอบที่ 26 เดิม) — เป็นข้อความสรุป
          ล้วนๆ ไม่ใช่รายการที่ดูเหมือนกดได้ทีละแถว จึงไม่สับสนว่ากดตรงไหนได้ */}
      {isGroup && statusBreakdown.length > 0 ? (
        <div className="yp-event-card__breakdown">
          <span className="yp-event-card__breakdown-label">รายการย่อย {totalTasks} รายการ</span>
          <span className="yp-event-card__breakdown-chips">
            {statusBreakdown.map(({ status, count }) => (
              <span key={status} className={`yp-chip yp-chip--sm ${statusChipClass(status)}`}>
                <span className="yp-chip-dot" aria-hidden="true" />
                {statusLabel(status)} {count}
              </span>
            ))}
          </span>
        </div>
      ) : null}

      {isGroup && totalTasks > 0 ? (
        <div className="yp-event-card__progress">
          <div
            className="yp-event-card__progress-bar"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`ความคืบหน้า ${progress}%`}
          >
            <div
              className="yp-event-card__progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="yp-event-card__progress-text">
            {doneTasks}/{totalTasks}
          </span>
        </div>
      ) : null}
    </Link>
  );
}
