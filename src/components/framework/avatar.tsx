'use client';

interface AvatarProps {
  name: string;
  color?: string;
  size?: number;
  className?: string;
  /** Image URL — if provided, shows the image instead of initials */
  imageSrc?: string;
}

/**
 * SVG-based Avatar (copy-resistant — เหมือน demo)
 * ใช้ SVG <text> แทน text node เพื่อกัน copy ตัวอักษร
 *
 * Round 19: Added image support with proper object-fit behavior.
 * When imageSrc is provided, the avatar shows the image centered
 * and properly contained within the circle — no overflow, no distortion.
 */
export function Avatar({ name, color = '#4F46E5', size = 32, className = '', imageSrc }: AvatarProps) {
  const initials = getInitials(name);
  const id = `avatar-grad-${color.replace('#', '')}`;
  const clipId = `avatar-clip-${id}`;

  if (imageSrc) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          overflow: 'hidden',
          display: 'block',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        <img
          src={imageSrc}
          alt={name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            display: 'block',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        />
      </div>
    );
  }

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
        <clipPath id={clipId}>
          <circle cx="20" cy="20" r="20" />
        </clipPath>
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
