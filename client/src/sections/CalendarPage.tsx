import { useState, useEffect, useCallback } from 'react';
import { calendarApi, CalendarEvent } from '../lib/api';
import { ChevronLeft, ChevronRight, MapPin, Music2, CheckCircle2 } from 'lucide-react';

const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const WEEKDAYS = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

const TYPE_ICONS: Record<string, React.ReactNode> = {
  tour: <Music2 className="w-3 h-3" />,
  stop: <MapPin className="w-3 h-3" />,
  offer: <CheckCircle2 className="w-3 h-3" />,
};

const TYPE_LABELS: Record<string, string> = {
  tour: 'Тур',
  stop: 'Концерт',
  offer: 'Принятый запрос',
};

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await calendarApi.getEvents(year, month);
      setEvents(data.events);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [year, month]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Первый день месяца (0=вс..6=сб → нам нужно пн=0)
  const firstDow = new Date(year, month - 1, 1).getDay();
  const startOffset = firstDow === 0 ? 6 : firstDow - 1;
  const daysInMonth = new Date(year, month, 0).getDate();

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const eventsForDay = (day: number): CalendarEvent[] => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => {
      const start = e.start_date?.slice(0, 10);
      const end   = (e.end_date ?? e.start_date)?.slice(0, 10);
      return start && dateStr >= start && dateStr <= (end ?? start);
    });
  };

  const selectedEvents = selectedDay ? eventsForDay(selectedDay) : [];

  const isToday = (day: number) =>
    year === today.getFullYear() &&
    month === today.getMonth() + 1 &&
    day === today.getDate();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Календарь</h1>
          <p className="text-[13.5px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Расписание туров и концертов
          </p>
        </div>

        {/* Навигация */}
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="btn btn-ghost btn-icon">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[15px] font-semibold min-w-[160px] text-center" style={{ color: 'var(--text-primary)' }}>
            {MONTHS_RU[month - 1]} {year}
          </span>
          <button onClick={nextMonth} className="btn btn-ghost btn-icon">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Легенда */}
      <div className="flex items-center gap-4 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
        {Object.entries(TYPE_LABELS).map(([type, label]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: type === 'tour' ? '#6366f1' : type === 'stop' ? '#fb923c' : '#34d399' }} />
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Календарная сетка */}
        <div className="lg:col-span-2 card overflow-hidden">
          {/* Дни недели */}
          <div className="grid grid-cols-7" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            {WEEKDAYS.map(d => (
              <div key={d} className="py-2.5 text-center text-[12px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Дни */}
          {loading ? (
            <div className="py-20 text-center text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Загрузка...</div>
          ) : (
            <div className="grid grid-cols-7">
              {/* Пустые ячейки до начала месяца */}
              {Array.from({ length: startOffset }).map((_, i) => (
                <div key={`empty-${i}`} className="h-16 sm:h-20" style={{ borderRight: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }} />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayEvents = eventsForDay(day);
                const selected = selectedDay === day;

                return (
                  <div
                    key={day}
                    onClick={() => setSelectedDay(selected ? null : day)}
                    className="h-16 sm:h-20 p-1.5 cursor-pointer transition-colors"
                    style={{
                      borderRight: '1px solid var(--border-subtle)',
                      borderBottom: '1px solid var(--border-subtle)',
                      background: selected ? 'var(--accent-muted)' : 'transparent',
                    }}
                    onMouseEnter={e => {
                      if (!selected) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-subtle)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.background = selected ? 'var(--accent-muted)' : 'transparent';
                    }}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[13px] font-medium mb-1"
                      style={{
                        background: isToday(day) ? 'var(--accent)' : 'transparent',
                        color: isToday(day) ? '#fff' : 'var(--text-primary)',
                      }}
                    >
                      {day}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 2).map(ev => (
                        <div
                          key={ev.id}
                          className="text-[10px] px-1 py-0.5 rounded truncate flex items-center gap-0.5"
                          style={{ background: ev.color + '30', color: ev.color }}
                        >
                          {TYPE_ICONS[ev.type]}
                          <span className="truncate">{ev.title}</span>
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                          +{dayEvents.length - 2}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Боковая панель — события дня */}
        <div className="card p-5">
          {selectedDay ? (
            <>
              <h3 className="text-[14px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                {selectedDay} {MONTHS_RU[month - 1].toLowerCase()} {year}
              </h3>
              {selectedEvents.length === 0 ? (
                <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Нет мероприятий</p>
              ) : (
                <div className="space-y-3">
                  {selectedEvents.map(ev => (
                    <div
                      key={ev.id}
                      className="p-3 rounded-xl"
                      style={{ background: ev.color + '15', border: `1px solid ${ev.color}40` }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span style={{ color: ev.color }}>{TYPE_ICONS[ev.type]}</span>
                        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: ev.color }}>
                          {TYPE_LABELS[ev.type]}
                        </span>
                      </div>
                      <p className="text-[13.5px] font-medium" style={{ color: 'var(--text-primary)' }}>
                        {ev.title}
                      </p>
                      {ev.city && (
                        <p className="text-[12px] mt-0.5 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                          <MapPin className="w-3 h-3" />{ev.city}
                        </p>
                      )}
                      {ev.band_name && (
                        <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                          {ev.band_name}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="py-8 text-center">
              <div className="text-[28px] font-bold mb-2" style={{ color: 'var(--accent)' }}>
                {events.length}
              </div>
              <p className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
                событий в {MONTHS_RU[month - 1].toLowerCase()}
              </p>
              <p className="text-[12px] mt-4" style={{ color: 'var(--text-tertiary)' }}>
                Нажмите на день для просмотра событий
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
