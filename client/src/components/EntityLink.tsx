import { ReactNode } from 'react';
import { NavigateFn, Section, NavigateParams } from '../App';

type Props = {
  label: string;
  section: Section;
  params: NavigateParams;
  onNavigate: NavigateFn;
  className?: string;
  children?: ReactNode;
};

export function EntityLink({ label, section, params, onNavigate, className = '', children }: Props) {
  return (
    <button
      type="button"
      onClick={() => onNavigate(section, params)}
      className={`transition-colors hover:underline ${className}`}
      style={{ color: 'var(--accent)', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
    >
      {children ?? label}
    </button>
  );
}
