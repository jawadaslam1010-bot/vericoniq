// VericonIQ — <VendorMark> primitive (drop into components/shared/vendor-mark.tsx)
//
// Colored monogram square used everywhere a vendor is referenced.
// Tone is deterministic from the vendor id (or pass an explicit `tone`).
//
// Usage:
//   <VendorMark name={vendor.name} id={vendor.id} />
//   <VendorMark name="Telstra" tone="#0f76b3" size={32} radius={8} />

import { cn } from '@/lib/utils';

// Curated palette — keep saturated enough to be legible on cream
const TONES = [
  '#0f76b3', // telecom blue
  '#d97706', // amber
  '#1e40af', // deep blue
  '#b25b3d', // copper
  '#16a34a', // green
  '#7c3aed', // violet
  '#0d9488', // teal (matches brand, use sparingly)
];

function pickTone(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return TONES[Math.abs(h) % TONES.length];
}

export function VendorMark({
  name,
  id,
  tone,
  size = 36,
  radius = 9,
  className,
}: {
  name: string;
  id?: string;
  tone?: string;
  size?: number;
  radius?: number;
  className?: string;
}) {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  const color = tone ?? pickTone(id ?? name);
  return (
    <div
      title={name}
      className={cn('grid place-items-center text-white flex-shrink-0 font-bold', className)}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: color,
        fontSize: size * 0.42,
        letterSpacing: '-0.01em',
      }}
    >
      {initial}
    </div>
  );
}
