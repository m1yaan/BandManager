import { useState, useEffect, useCallback } from 'react';
import { supportApi, SupportTicket } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import { EmptyState } from '../components/EmptyState';
import { toast } from 'sonner';
import {
  HelpCircle, Plus, Send, Clock, CheckCircle2, AlertCircle, XCircle,
  ChevronDown, ChevronUp,
} from 'lucide-react';

const STATUS_CONFIG = {
  open:        { label: 'Открыт',   color: 'var(--info)',    bg: 'var(--info-muted)',    icon: <Clock className="w-3 h-3" /> },
  in_progress: { label: 'В работе', color: 'var(--warning)', bg: 'var(--warning-muted)', icon: <AlertCircle className="w-3 h-3" /> },
  resolved:    { label: 'Решён',    color: 'var(--success)', bg: 'var(--success-muted)', icon: <CheckCircle2 className="w-3 h-3" /> },
  closed:      { label: 'Закрыт',   color: 'var(--text-tertiary)', bg: 'var(--bg-elevated)', icon: <XCircle className="w-3 h-3" /> },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.open;
  return (
    <span className="badge flex items-center gap-1" style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function TicketCard({ ticket, isAdmin, onStatusChange }: {
  ticket: SupportTicket;
  isAdmin: boolean;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const formatDate = (dt: string) => new Date(dt).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="glass-card overflow-hidden animate-fade-in">
      <div
        className="flex items-start gap-4 px-5 py-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap mb-1">
            <h3 className="text-[14.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              {ticket.subject}
            </h3>
            <StatusBadge status={ticket.status} />
          </div>
          {isAdmin && ticket.user_email && (
            <p className="text-[12px] mb-1" style={{ color: 'var(--text-tertiary)' }}>
              От: {ticket.user_name || ticket.user_email}
            </p>
          )}
          <p className="text-[12.5px]" style={{ color: 'var(--text-tertiary)' }}>
            {formatDate(ticket.created_at)}
          </p>
        </div>
        <button className="btn btn-ghost btn-icon flex-shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {expanded && (
        <div
          className="px-5 pb-5 space-y-4 animate-fade-in"
          style={{ borderTop: '1px solid var(--glass-border)' }}
        >
          <div className="pt-4">
            <p className="text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Сообщение:</p>
            <p
              className="text-[13.5px] leading-relaxed p-3 rounded-xl"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
            >
              {ticket.message}
            </p>
          </div>

          {ticket.file_url && (
            <div>
              <p className="text-[13px] font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Вложение:</p>
              <a
                href={ticket.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px]"
                style={{ color: 'var(--accent)' }}
              >
                {ticket.file_url}
              </a>
            </div>
          )}

          {ticket.admin_note && (
            <div
              className="p-3 rounded-xl"
              style={{ background: 'var(--accent-muted)', border: '1px solid var(--accent-border)' }}
            >
              <p className="text-[12px] font-semibold mb-1" style={{ color: 'var(--accent)' }}>
                Ответ поддержки:
              </p>
              <p className="text-[13.5px]" style={{ color: 'var(--text-primary)' }}>
                {ticket.admin_note}
              </p>
            </div>
          )}

          {isAdmin && (
            <div>
              <p className="text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Изменить статус:
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => onStatusChange(ticket.id, key)}
                    className="badge flex items-center gap-1 transition-all cursor-pointer"
                    style={{
                      background: ticket.status === key ? cfg.bg : 'var(--bg-elevated)',
                      color: ticket.status === key ? cfg.color : 'var(--text-secondary)',
                      border: `1px solid ${ticket.status === key ? cfg.color + '40' : 'transparent'}`,
                      padding: '4px 10px',
                    }}
                  >
                    {cfg.icon}{cfg.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SupportPage() {
  const { isAdmin } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [form, setForm] = useState({ subject: '', message: '', file_url: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchTickets = useCallback(async () => {
    try {
      const data = await supportApi.getAll(statusFilter !== 'all' ? statusFilter : undefined);
      setTickets(data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const handleCreate = async () => {
    if (!form.subject.trim() || !form.message.trim()) {
      setError('Тема и сообщение обязательны');
      return;
    }
    setSaving(true); setError('');
    try {
      await supportApi.create({ subject: form.subject.trim(), message: form.message.trim(), file_url: form.file_url.trim() || undefined });
      toast.success('Тикет создан. Мы свяжемся с вами в ближайшее время.');
      setForm({ subject: '', message: '', file_url: '' });
      setShowForm(false);
      await fetchTickets();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка';
      setError(msg); toast.error(msg);
    } finally { setSaving(false); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await supportApi.update(id, { status });
      toast.success('Статус обновлён');
      await fetchTickets();
    } catch { toast.error('Ошибка обновления статуса'); }
  };

  const openCount = tickets.filter(t => t.status === 'open').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Поддержка
          </h1>
          <p className="text-[13.5px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {isAdmin
              ? `${tickets.length} тикетов${openCount > 0 ? ` · ${openCount} открытых` : ''}`
              : 'Свяжитесь с командой поддержки'}
          </p>
        </div>
        {!isAdmin && (
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            <Plus className="w-4 h-4" />
            Создать тикет
          </button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { value: 'all',        label: 'Все' },
          { value: 'open',       label: 'Открытые' },
          { value: 'in_progress', label: 'В работе' },
          { value: 'resolved',   label: 'Решённые' },
          { value: 'closed',     label: 'Закрытые' },
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className="btn text-[12.5px] py-1.5 px-3 transition-all"
            style={{
              background: statusFilter === value ? 'var(--accent)' : 'var(--bg-elevated)',
              color: statusFilter === value ? '#fff' : 'var(--text-secondary)',
              border: `1px solid ${statusFilter === value ? 'var(--accent)' : 'var(--border-base)'}`,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="skeleton mb-2" style={{ width: '55%', height: 16 }} />
              <div className="skeleton" style={{ width: '30%', height: 12 }} />
            </div>
          ))}
        </div>
      ) : tickets.length === 0 ? (
        <EmptyState
          icon={<HelpCircle className="w-5 h-5" />}
          title={isAdmin ? 'Нет тикетов' : 'Нет обращений'}
          description={isAdmin ? 'Тикеты появятся когда пользователи обратятся за помощью' : 'Создайте тикет, если у вас есть вопрос или проблема'}
          action={!isAdmin ? (
            <button onClick={() => setShowForm(true)} className="btn btn-primary">
              <Plus className="w-4 h-4" /> Создать тикет
            </button>
          ) : undefined}
        />
      ) : (
        <div className="space-y-3">
          {tickets.map(t => (
            <TicketCard
              key={t.id}
              ticket={t}
              isAdmin={isAdmin}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      {showForm && (
        <Modal
          title="Новый тикет"
          subtitle="Опишите вашу проблему или вопрос"
          onClose={() => { setShowForm(false); setError(''); }}
          footer={
            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowForm(false); setError(''); }} className="btn btn-ghost">Отмена</button>
              <button onClick={handleCreate} disabled={saving} className="btn btn-primary">
                <Send className="w-4 h-4" />
                {saving ? 'Отправка...' : 'Отправить'}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Тема *
              </label>
              <input
                autoFocus
                className="input-base"
                value={form.subject}
                onChange={e => setForm({ ...form, subject: e.target.value })}
                placeholder="Кратко опишите проблему"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Сообщение *
              </label>
              <textarea
                className="input-base"
                rows={5}
                value={form.message}
                onChange={e => setForm({ ...form, message: e.target.value })}
                placeholder="Подробно опишите вашу проблему или вопрос..."
                style={{ resize: 'vertical' }}
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                Ссылка на файл (необязательно)
              </label>
              <input
                className="input-base"
                value={form.file_url}
                onChange={e => setForm({ ...form, file_url: e.target.value })}
                placeholder="https://example.com/screenshot.png"
              />
            </div>
            {error && <p className="text-[13px]" style={{ color: 'var(--error)' }}>{error}</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}
