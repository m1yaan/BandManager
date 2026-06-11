import { useState, useEffect } from 'react';
import { reportsApi, bandsApi, singersApi, Band, Singer } from '../lib/api';
import { Search, Music2, Mic2, Radio, MapPin, Star } from 'lucide-react';

type ReportResult = Record<string, string | number | null | string[]>[];

function ReportCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
            {icon}
          </div>
          <h3 className="text-[14.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        </div>
        <p className="text-[13px] ml-11" style={{ color: 'var(--text-secondary)' }}>{description}</p>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

const DATE_KEYS = new Set(['start_date', 'end_date', 'release_date']);

function formatDateValue(value: string | number | null): string {
  if (value == null || value === '') return '—';
  const raw = String(value);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match;
    return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  }
  return raw;
}

function formatCell(key: string, value: string | number | null | string[]): string {
  if (value == null || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  if (DATE_KEYS.has(key)) return formatDateValue(value);
  return String(value);
}

function ResultTable({ data }: { data: ReportResult }) {
  if (!data.length) return (
    <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Нет данных</p>
  );

  const keys = Object.keys(data[0]);
  const LABELS: Record<string, string> = {
    title: 'Название', composer: 'Композитор', composer_name: 'Композитор',
    creation_year: 'Год', release_date: 'Дата выпуска',
    name: 'Название', country: 'Страна', rating: 'Рейтинг',
    lyricist: 'Поэт', lyricist_name: 'Поэт', bands: 'Группы', band_name: 'Группа',
    program_name: 'Программа', city: 'Город', start_date: 'Начало',
    end_date: 'Конец', avg_ticket_price: 'Цена билета',
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            {keys.map(k => (
              <th key={k} className="text-left px-3 py-2 text-[11.5px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                {LABELS[k] ?? k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="table-row-hover transition-colors" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {keys.map(k => (
                <td key={k} className="px-3 py-2.5 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                  {formatCell(k, row[k] as string | number | null | string[])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ReportsPage() {
  const [bands, setBands] = useState<Band[]>([]);
  const [singers, setSingers] = useState<Singer[]>([]);

  const [r1, setR1] = useState<ReportResult>([]);
  const [r2, setR2] = useState<ReportResult>([]);
  const [r3, setR3] = useState<ReportResult>([]);
  const [r4, setR4] = useState<ReportResult>([]);
  const [r5, setR5] = useState<ReportResult>([]);
  const [r6, setR6] = useState<ReportResult>([]);

  const [sel1, setSel1] = useState('');
  const [inp2, setInp2] = useState('');
  const [inp3, setInp3] = useState('');
  const [sel5, setSel5] = useState('');
  const [sel6, setSel6] = useState('');

  const [loading, setLoading] = useState<Record<number, boolean>>({});

  useEffect(() => {
    bandsApi.getAll().then(setBands).catch(console.error);
    singersApi.getAll().then(setSingers).catch(console.error);
    // Запрос 4 — без параметров
    reportsApi.topBandRepertoire().then(d => setR4(d as ReportResult)).catch(console.error);
  }, []);

  const setters: Record<number, (d: ReportResult) => void> = {
    1: setR1, 2: setR2, 3: setR3, 4: setR4, 5: setR5, 6: setR6,
  };

  const run = async (num: number, fn: () => Promise<ReportResult>) => {
    setLoading(p => ({ ...p, [num]: true }));
    try {
      const d = await fn();
      setters[num](d);
    } catch (err) { console.error(err); }
    finally { setLoading(p => ({ ...p, [num]: false })); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Аналитические отчёты</h1>
        <p className="text-[13.5px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>6 аналитических запросов к базе данных</p>
      </div>

      <div className="space-y-4">
        {/* 1. Песни на гастролях группы */}
        <ReportCard icon={<Music2 className="w-4 h-4" />} title="1. Песни на гастролях группы" description="Все уникальные песни, исполненные группой в турах">
          <div className="flex gap-2 mb-4">
            <select className="input-base flex-1" style={{ padding: '8px 12px', fontSize: 13 }} value={sel1} onChange={e => setSel1(e.target.value)}>
              <option value="">Выберите группу</option>
              {bands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <button
              onClick={() => sel1 && run(1, () => reportsApi.songsByBandTours(sel1) as Promise<ReportResult>)}
              disabled={!sel1 || loading[1]}
              className="btn btn-primary flex-shrink-0"
            >
              <Search className="w-4 h-4" />
              {loading[1] ? 'Поиск…' : 'Найти'}
            </button>
          </div>
          <ResultTable data={r1} />
        </ReportCard>

        {/* 2. Группы по композитору */}
        <ReportCard icon={<Radio className="w-4 h-4" />} title="2. Группы, исполняющие произведения композитора" description="Группы, в репертуаре которых есть песни заданного композитора">
          <div className="flex gap-2 mb-4">
            <input className="input-base flex-1" style={{ padding: '8px 12px', fontSize: 13 }} value={inp2} onChange={e => setInp2(e.target.value)} placeholder="Имя композитора" onKeyDown={e => e.key === 'Enter' && inp2 && run(2, () => reportsApi.bandsByComposer(inp2) as Promise<ReportResult>)} />
            <button
              onClick={() => inp2 && run(2, () => reportsApi.bandsByComposer(inp2) as Promise<ReportResult>)}
              disabled={!inp2 || loading[2]}
              className="btn btn-primary flex-shrink-0"
            >
              <Search className="w-4 h-4" />
              {loading[2] ? 'Поиск…' : 'Найти'}
            </button>
          </div>
          <ResultTable data={r2} />
        </ReportCard>

        {/* 3. Информация о песне */}
        <ReportCard icon={<Radio className="w-4 h-4" />} title="3. Информация о песне" description="Данные о песне по названию, включая список исполняющих групп">
          <div className="flex gap-2 mb-4">
            <input className="input-base flex-1" style={{ padding: '8px 12px', fontSize: 13 }} value={inp3} onChange={e => setInp3(e.target.value)} placeholder="Название песни" onKeyDown={e => e.key === 'Enter' && inp3 && run(3, () => reportsApi.songInfo(inp3) as Promise<ReportResult>)} />
            <button
              onClick={() => inp3 && run(3, () => reportsApi.songInfo(inp3) as Promise<ReportResult>)}
              disabled={!inp3 || loading[3]}
              className="btn btn-primary flex-shrink-0"
            >
              <Search className="w-4 h-4" />
              {loading[3] ? 'Поиск…' : 'Найти'}
            </button>
          </div>
          <ResultTable data={r3} />
        </ReportCard>

        {/* 4. Репертуар топ-группы */}
        <ReportCard icon={<Star className="w-4 h-4" />} title="4. Репертуар наиболее популярной группы" description="Автоматически выбирает группу с наивысшим рейтингом">
          <div className="mb-4">
            <button
              onClick={() => run(4, () => reportsApi.topBandRepertoire() as Promise<ReportResult>)}
              disabled={loading[4]}
              className="btn btn-primary"
            >
              <Search className="w-4 h-4" />
              {loading[4] ? 'Загрузка…' : 'Обновить'}
            </button>
          </div>
          <ResultTable data={r4} />
        </ReportCard>

        {/* 5. Туры группы */}
        <ReportCard icon={<MapPin className="w-4 h-4" />} title="5. Гастроли группы" description="Места и даты всех гастрольных туров выбранной группы">
          <div className="flex gap-2 mb-4">
            <select className="input-base flex-1" style={{ padding: '8px 12px', fontSize: 13 }} value={sel5} onChange={e => setSel5(e.target.value)}>
              <option value="">Выберите группу</option>
              {bands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <button
              onClick={() => sel5 && run(5, () => reportsApi.toursByBand(sel5) as Promise<ReportResult>)}
              disabled={!sel5 || loading[5]}
              className="btn btn-primary flex-shrink-0"
            >
              <Search className="w-4 h-4" />
              {loading[5] ? 'Поиск…' : 'Найти'}
            </button>
          </div>
          <ResultTable data={r5} />
        </ReportCard>

        {/* 6. Песни исполнителя */}
        <ReportCard icon={<Mic2 className="w-4 h-4" />} title="6. Песни исполнителя" description="Все песни, привязанные к исполнителю напрямую">
          <div className="flex gap-2 mb-4">
            <select className="input-base flex-1" style={{ padding: '8px 12px', fontSize: 13 }} value={sel6} onChange={e => setSel6(e.target.value)}>
              <option value="">Выберите исполнителя</option>
              {singers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button
              onClick={() => sel6 && run(6, () => reportsApi.songsBySinger(sel6) as Promise<ReportResult>)}
              disabled={!sel6 || loading[6]}
              className="btn btn-primary flex-shrink-0"
            >
              <Search className="w-4 h-4" />
              {loading[6] ? 'Поиск…' : 'Найти'}
            </button>
          </div>
          <ResultTable data={r6} />
        </ReportCard>
      </div>
    </div>
  );
}