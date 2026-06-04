import { ReactNode } from 'react';

type TooltipProps = {
  label: string;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
};

export function Tooltip({ label, children, side = 'top' }: TooltipProps) {
  const positions = {
    top:    'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left:   'right-full top-1/2 -translate-y-1/2 mr-2',
    right:  'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative inline-flex group">
      {children}
      <span
        className={`
          pointer-events-none absolute z-50 whitespace-nowrap
          px-2.5 py-1.5 text-[12px] font-medium rounded-lg
          opacity-0 scale-95 transition-all duration-150
          group-hover:opacity-100 group-hover:scale-100
          ${positions[side]}
        `}
        style={{
          background: 'var(--bg-overlay)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-strong)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {label}
      </span>
    </div>
  );
}
