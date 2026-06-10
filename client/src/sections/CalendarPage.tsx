import { useState, useEffect, useCallback } from 'react';
import { calendarApi, CalendarEvent, CalendarStop } from '../lib/api';
import { ChevronLeft, ChevronRight, MapPin, Music2, CheckCircle2, ChevronDown } from 'lucide-react';

const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const WEEKDAYS = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

const TYPE_ICONS: Record<string, React.ReactNode> = {
  tour: <Music2 className="w-3 h-3" />,
  offer: <CheckCircle2 className="w-3 h-3" />,
};

const TYPE_LABELS: Record<string, string> = {
  tour: 'Тур',
  offer: 'Принятый запрос',
};

function EventCard({ event }: { event: CalendarEvent }) {
  const [expanded, setExpanded] = useState(false);
  const hasStops = event.type === 'tour' && (event.stops?.length ?? 0) > 0;

  return (
    <div className="p-3 rounded-xl" style={{ background: event.color + '15', border: `1px solid ${event.color}40` }}>
      <div className="flex items-center gap-2 mb-1">
        <span style={{ color: event.color }}>{TYPE_ICONS[event.type] ?? TYPE_ICONS.tour}</span>
        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: event.color }}>
          {TYPE_LABELS[event.type] ?? event.type}
        </span>
        {hasStops && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-auto flex items-center gap-1 text-[11px]"
            style={{ color: event.color }}
          >
            {event.stops.length} конц.
            <ChevronDown className="w-3 h-3" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>
        )}
      </div>
      <p className="text-[13.5px] font-medium" style={{ color: 'var(--text-primary)' }}>
        {event.title}
      </p>
      {event.city && (
        <p className="text-[12px] mt-0.5 flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
          <MapPin className="w-3 h-3" />{event.city}
        </p>
      )}
      {event.band_name && (
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{event.band_name}</p>
      )}
      {expanded && hasStops && (
        <div className="mt-2 space-y-1.5 pt-2" style={{ borderTop: `1px solid ${event.color}30` }}>
          {event.stops.map((stop: CalendarStop) => (
            <div key={stop.id} className="flex items-center gap-2 text-[12px]">
              <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: event.color, opacity: 0.7 }} />
              <span style={{ color: 'var(--text-primary)' }}>{stop.city}</span>
              {stop.event_date && (
                <span style={{ color: 'var(--text-tertiary)' }}>
                  {new Date(stop.event_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                </span>
              )}
              {stop.ticket_price > 0 && (
                <span className="ml-auto" style={{ color: 'var(--success)' }}>
                  {stop.ticket_price.toLocaleString()} ₽
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
      setEvents(data.events.map(e => ({ ...e, stops: e.stops ?? [] })));
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [year, month]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

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
      if (e.type === 'tour' && e.stops?.length > 0) {
        const hasStop = e.stops.some(s => s.event_date?.slice(0, 10) === dateStr);
        if (hasStop) return true;
      }
      const start = e.start_date?.slice(0, 10);
      const end = (e.end_date ?? e.start_date)?.slice(0, 10);
      return start && dateStr >= start && dateStr <= (end ?? start);
    });
  };

  const selectedEvents = selectedDay ? eventsForDay(selectedDay) : [];

  const isToday = (day: number) =>
    year === today.getFullYear() && month === today.getMonth() + 1 && day === today.getDate();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Календарь</h1>
          <p className="text-[13.5px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>Расписание туров и концертов</p>
        </div>
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

      <div className="flex items-center gap-4 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#6366f1' }} />Тур (с остановками)
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#34d399' }} />Принятый запрос
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="grid grid-cols-7" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            {WEEKDAYS.map(d => (
              <div key={d} className="py-2.5 text-center text-[12px] font-semibold uppercase tracking-wide"
                style={{ color: 'var(--text-tertiary)' }}>{d}</div>
            ))}
          </div>

          {loading ? (
            <div className="py-20 text-center text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Загрузка...</div>
          ) : (
            <div className="grid grid-cols-7">
              {Array.from({ length: startOffset }).map((_, i) => (
                <div key={`empty-${i}`} className="h-16 sm:h-20"
                  style={{ borderRight: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }} />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayEvents = eventsForDay(day);
                const selected = selectedDay === day;

                return (
                  <div key={day}
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
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[13px] font-medium mb-1"
                      style={{
                        background: isToday(day) ? 'var(--accent)' : 'transparent',
                        color: isToday(day) ? '#fff' : 'var(--text-primary)',
                      }}
                    >{day}</div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, 2).map(ev => (
                        <div key={ev.id}
                          className="text-[10px] px-1 py-0.5 rounded truncate flex items-center gap-0.5"
                          style={{ background: ev.color + '30', color: ev.color }}
                        >
                          {TYPE_ICONS[ev.type] ?? TYPE_ICONS.tour}
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
                  {selectedEvents.map(ev => <EventCard key={ev.id} event={ev} />)}
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
