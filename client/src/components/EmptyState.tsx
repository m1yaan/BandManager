import { ReactNode } from 'react';

type Props = {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="card flex flex-col items-center justify-center py-16 px-8 text-center">
      {icon && (
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-base)',
            color: 'var(--text-tertiary)',
          }}
        >
          {icon}
        </div>
      )}
      <p
        className="text-[15px] font-medium mb-1"
        style={{ color: 'var(--text-primary)' }}
      >
        {title}
      </p>
      {description && (
        <p
          className="text-[13px] max-w-xs"
          style={{ color: 'var(--text-secondary)' }}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
