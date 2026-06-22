import { useState, useEffect, useRef, useCallback } from 'react';
import { searchApi, SearchResults } from '../lib/api';
import { Search, Music2, Mic2, Radio, MapPin, MessageSquare, X } from 'lucide-react';
import { Section } from '../App';

type Props = {
  onNavigate: (section: Section) => void;
};

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function GlobalSearch({ onNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery.length < 2) { setResults(null); return; }
    setLoading(true);
    searchApi.search(debouncedQuery)
      .then(setResults)
      .catch(() => setResults(null))
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setResults(null);
  }, []);

  const hasResults = results && (
    results.bands.length + results.singers.length + results.songs.length +
    results.tours.length + results.messages.length > 0
  );

  return (
    <>
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] transition-all"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-base)',
          color: 'var(--text-tertiary)',
        }}
        title="Поиск (Ctrl+K)"
      >
        <Search className="w-4 h-4" />
        <span className="hidden sm:block">Поиск...</span>
        <kbd
          className="hidden sm:block text-[10px] px-1.5 py-0.5 rounded"
          style={{ background: 'var(--bg-overlay)', color: 'var(--text-tertiary)' }}
        >
          ⌘K
        </kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
            onClick={close}
          />
          <div
            className="relative w-full max-w-xl animate-scale-in"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-base)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <Search className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Поиск групп, артистов, песен, туров..."
                className="flex-1 bg-transparent outline-none text-[14px]"
                style={{ color: 'var(--text-primary)' }}
              />
              {query && (
                <button onClick={() => { setQuery(''); setResults(null); }} className="btn btn-ghost btn-icon">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto p-2">
              {loading && (
                <div className="py-8 text-center text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                  Поиск...
                </div>
              )}

              {!loading && query.length >= 2 && !hasResults && (
                <div className="py-8 text-center text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                  Ничего не найдено по запросу «{query}»
                </div>
              )}

              {!loading && results && (
                <>
                  {results.bands.length > 0 && (
                    <SearchSection
                      title="Группы"
                      icon={<Music2 className="w-3.5 h-3.5" />}
                      items={results.bands.map(b => ({
                        id: b.id,
                        label: b.name,
                        sub: b.country || '',
                        onClick: () => { onNavigate('bands'); close(); },
                      }))}
                    />
                  )}
                  {results.singers.length > 0 && (
                    <SearchSection
                      title="Исполнители"
                      icon={<Mic2 className="w-3.5 h-3.5" />}
                      items={results.singers.map(s => ({
                        id: s.id,
                        label: s.name,
                        sub: '',
                        onClick: () => { onNavigate('singers'); close(); },
                      }))}
                    />
                  )}
                  {results.songs.length > 0 && (
                    <SearchSection
                      title="Песни"
                      icon={<Radio className="w-3.5 h-3.5" />}
                      items={results.songs.map(s => ({
                        id: s.id,
                        label: s.title,
                        sub: (s as { composer?: string }).composer ?? '',
                        onClick: () => { onNavigate('songs'); close(); },
                      }))}
                    />
                  )}
                  {results.tours.length > 0 && (
                    <SearchSection
                      title="Туры"
                      icon={<MapPin className="w-3.5 h-3.5" />}
                      items={results.tours.map(t => ({
                        id: t.id,
                        label: t.program_name,
                        sub: t.city,
                        onClick: () => { onNavigate('tours'); close(); },
                      }))}
                    />
                  )}
                  {results.messages.length > 0 && (
                    <SearchSection
                      title="Сообщения"
                      icon={<MessageSquare className="w-3.5 h-3.5" />}
                      items={results.messages.map(m => ({
                        id: m.id,
                        label: m.sender_name,
                        sub: m.organization,
                        onClick: () => { onNavigate('messages'); close(); },
                      }))}
                    />
                  )}
                </>
              )}

              {!query && (
                <div className="py-6 text-center text-[13px]" style={{ color: 'var(--text-tertiary)' }}>
                  Введите запрос для поиска
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SearchSection({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items: { id: string; label: string; sub: string; onClick: () => void }[];
}) {
  return (
    <div className="mb-2">
      <div className="flex items-center gap-1.5 px-3 py-1.5">
        <span style={{ color: 'var(--text-tertiary)' }}>{icon}</span>
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
          {title}
        </span>
      </div>
      {items.map(item => (
        <button
          key={item.id}
          onClick={item.onClick}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all"
          style={{ color: 'var(--text-primary)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <span className="text-[13.5px] font-medium">{item.label}</span>
          {item.sub && (
            <span className="text-[12px] ml-auto" style={{ color: 'var(--text-tertiary)' }}>{item.sub}</span>
          )}
        </button>
      ))}
    </div>
  );
}
