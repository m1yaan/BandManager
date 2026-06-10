import { useState, useRef, useEffect, useCallback } from 'react';
import { Globe, ChevronDown, Plus, AlertTriangle } from 'lucide-react';

const COUNTRIES = [
  'Австралия', 'Австрия', 'Азербайджан', 'Аргентина', 'Беларусь',
  'Бельгия', 'Бразилия', 'Великобритания', 'Германия', 'Голландия',
  'Греция', 'Дания', 'Египет', 'Израиль', 'Индия',
  'Иран', 'Ирландия', 'Испания', 'Италия', 'Казахстан',
  'Канада', 'Китай', 'Мексика', 'Нидерланды', 'Норвегия',
  'Польша', 'Португалия', 'Россия', 'Румыния', 'Сербия',
  'Словакия', 'США', 'Турция', 'Узбекистан', 'Украина',
  'Финляндия', 'Франция', 'Чехия', 'Швейцария', 'Швеция',
  'Южная Корея', 'Япония',
];

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
};

export function CountryCombobox({ value, onChange, placeholder = 'Выберите страну', label }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [confirmCustom, setConfirmCustom] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [highlighted, setHighlighted] = useState(0);

  useEffect(() => { setQuery(value); }, [value]);

  const filtered = COUNTRIES.filter(c =>
    c.toLowerCase().includes(query.toLowerCase())
  );

  const isKnown = COUNTRIES.some(c => c.toLowerCase() === query.toLowerCase());
  const showAddOption = query.trim().length > 0 && !isKnown;

  const handleSelect = useCallback((country: string) => {
    onChange(country);
    setQuery(country);
    setOpen(false);
    setConfirmCustom(null);
  }, [onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setOpen(true);
    setHighlighted(0);
    if (!e.target.value) onChange('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const items = [...filtered, ...(showAddOption ? ['__add__'] : [])];
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted(h => Math.min(h + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = items[highlighted];
      if (item === '__add__') {
        setConfirmCustom(query.trim());
      } else if (item) {
        handleSelect(item);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (!isKnown && query !== value) {
          setQuery(value);
        }
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isKnown, query, value]);

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      <div className="relative">
        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: 'var(--text-tertiary)' }} />
        <input
          ref={inputRef}
          className="input-base pl-9 pr-9"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2"
          onClick={() => { setOpen(o => !o); inputRef.current?.focus(); }}
        >
          <ChevronDown className="w-4 h-4" style={{
            color: 'var(--text-tertiary)',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
          }} />
        </button>
      </div>

      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden"
          style={{
            zIndex: 'var(--z-dropdown)',
            background: 'var(--bg-overlay)',
            border: '1px solid var(--border-base)',
            boxShadow: 'var(--shadow-lg)',
            maxHeight: 260,
            overflowY: 'auto',
          }}
        >
          {filtered.length === 0 && !showAddOption && (
            <div className="px-4 py-3 text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
              Страна не найдена
            </div>
          )}
          {filtered.map((c, i) => (
            <button
              key={c}
              type="button"
              className="w-full text-left px-4 py-2.5 text-[13.5px] transition-colors flex items-center gap-2"
              style={{
                background: i === highlighted ? 'var(--bg-elevated)' : 'transparent',
                color: c === value ? 'var(--accent)' : 'var(--text-primary)',
                fontWeight: c === value ? 600 : 400,
              }}
              onMouseEnter={() => setHighlighted(i)}
              onClick={() => handleSelect(c)}
            >
              {c}
              {c === value && <span className="ml-auto text-[11px]" style={{ color: 'var(--accent)' }}>✓</span>}
            </button>
          ))}
          {showAddOption && (
            <button
              type="button"
              className="w-full text-left px-4 py-2.5 text-[13.5px] transition-colors flex items-center gap-2"
              style={{
                background: highlighted === filtered.length ? 'var(--bg-elevated)' : 'transparent',
                color: 'var(--accent)',
              }}
              onMouseEnter={() => setHighlighted(filtered.length)}
              onClick={() => setConfirmCustom(query.trim())}
            >
              <Plus className="w-4 h-4" />
              Добавить «{query.trim()}»
            </button>
          )}
        </div>
      )}

      {confirmCustom && (
        <div
          className="absolute top-full left-0 right-0 mt-1 rounded-xl p-4"
          style={{
            zIndex: 'var(--z-dropdown)',
            background: 'var(--bg-overlay)',
            border: '1px solid var(--warning)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div className="flex items-start gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--warning)' }} />
            <p className="text-[13px]" style={{ color: 'var(--text-primary)' }}>
              Страна <strong>«{confirmCustom}»</strong> не найдена в стандартном списке. Добавить?
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              className="btn btn-ghost text-[12.5px] py-1.5 px-3"
              onClick={() => { setConfirmCustom(null); setQuery(value); setOpen(false); }}
            >
              Отмена
            </button>
            <button
              type="button"
              className="btn btn-primary text-[12.5px] py-1.5 px-3"
              onClick={() => handleSelect(confirmCustom)}
            >
              Добавить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
