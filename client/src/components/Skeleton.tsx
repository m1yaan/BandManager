type SkeletonProps = {
  className?: string;
  width?: string | number;
  height?: string | number;
};

export function Skeleton({ className = '', width, height }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width: width ?? '100%', height: height ?? '16px' }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="card p-5 space-y-3">
      <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 12 }} />
      <div className="skeleton" style={{ width: '60%', height: 28 }} />
      <div className="skeleton" style={{ width: '80%', height: 14 }} />
    </div>
  );
}

export function SkeletonTableRow({ cols = 4 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          <div className="skeleton" style={{ height: 16, width: i === 0 ? '70%' : '50%' }} />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="card p-4 flex items-center gap-4">
          <div className="skeleton flex-shrink-0" style={{ width: 40, height: 40, borderRadius: 12 }} />
          <div className="flex-1 space-y-2">
            <div className="skeleton" style={{ width: '55%', height: 16 }} />
            <div className="skeleton" style={{ width: '35%', height: 13 }} />
          </div>
        </div>
      ))}
    </div>
  );
}
