// VericonIQ — <Sparkline> primitive (drop into components/shared/sparkline.tsx)
//
// Pure SVG mini-trend. Default 88×28, end-point dot. Use STATUS dot color.

export function Sparkline({
  data,
  color,
  width = 88,
  height = 28,
  strokeWidth = 1.6,
  className,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
  className?: string;
}) {
  if (!data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - pad * 2) - pad;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const lastX = width;
  const lastY = height - ((data[data.length - 1] - min) / range) * (height - pad * 2) - pad;

  return (
    <svg width={width} height={height} className={className} style={{ display: 'block' }}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points.join(' ')}
      />
      <circle cx={lastX} cy={lastY} r={2.5} fill={color} />
    </svg>
  );
}
