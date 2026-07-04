'use client';

interface AvatarProps {
  name: string;
  color?: string;
  size?: number;
  className?: string;
}

/**
 * SVG-based Avatar (copy-resistant — เหมือน demo)
 * ใช้ SVG <text> แทน text node เพื่อกัน copy ตัวอักษร
 */
export function Avatar({ name, color = '#4F46E5', size = 32, className = '' }: AvatarProps) {
  const initials = getInitials(name);
  const id = `avatar-grad-${color.replace('#', '')}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      className={className}
      aria-hidden="true"
      style={{ display: 'block', pointerEvents: 'none', userSelect: 'none' }}
    >
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.85" />
          <stop offset="100%" stopColor={color} stopOpacity="1" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="20" fill={`url(#${id})`} />
      <text
        x="50%"
        y="50%"
        dy="0.35em"
        textAnchor="middle"
        fontFamily="var(--yp-font-stack), sans-serif"
        fontSize={size < 36 ? '14' : '16'}
        fontWeight="700"
        fill="white"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {initials}
      </text>
    </svg>
  );
}

function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
