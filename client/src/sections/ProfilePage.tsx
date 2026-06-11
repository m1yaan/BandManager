import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../lib/api';
import { toast } from 'sonner';
import { User, Mail, Calendar, Save, Music2, Mic2, Radio, MapPin } from 'lucide-react';
import { dashboardApi } from '../lib/api';

const ROLE_LABELS: Record<string, string> = {
  manager: 'Менеджер',
  artist: 'Артист',
  admin: 'Администратор',
};

export default function ProfilePage() {
  const { user, refreshUser, role } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? '');
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ bands: 0, singers: 0, songs: 0, tours: 0 });

  useEffect(() => {
    setName(user?.name ?? '');
    setAvatarUrl(user?.avatar_url ?? '');
  }, [user]);

  useEffect(() => {
    dashboardApi.getStats().then(s => setStats({ bands: s.bands, singers: s.singers, songs: s.songs, tours: s.tours })).catch(console.error);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await authApi.updateProfile({ name: name.trim(), avatar_url: avatarUrl.trim() });
      await refreshUser();
      toast.success('Профиль обновлён');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally { setSaving(false); }
  };

  const initials = name
    ? name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? 'БМ';

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Профиль</h1>
        <p className="text-[13.5px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>Управление вашим аккаунтом</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Левая колонка — аватар и статистика */}
        <div className="space-y-4">
          {/* Аватар */}
          <div className="card p-6 flex flex-col items-center text-center">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Аватар"
                className="w-24 h-24 rounded-2xl object-cover mb-4"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div
                className="w-24 h-24 rounded-2xl flex items-center justify-center mb-4 text-[28px] font-bold text-white"
                style={{ background: 'var(--accent)', boxShadow: '0 0 24px rgba(99,102,241,0.3)' }}
              >
                {initials}
              </div>
            )}
            <p className="font-semibold text-[16px]" style={{ color: 'var(--text-primary)' }}>
              {name || user?.email?.split('@')[0]}
            </p>
            <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {ROLE_LABELS[role] ?? role}
            </p>
            <div className="flex items-center gap-1.5 mt-2 text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
              <Calendar className="w-3.5 h-3.5" />
              В системе с {memberSince}
            </div>
          </div>

          {/* Статистика */}
          <div className="card p-5">
            <h3 className="text-[13px] font-semibold uppercase tracking-wide mb-4" style={{ color: 'var(--text-tertiary)' }}>Статистика</h3>
            <div className="space-y-3">
              {[
                { label: 'Групп', value: stats.bands, icon: <Music2 className="w-4 h-4" />, color: '#6366f1' },
                { label: 'Исполнителей', value: stats.singers, icon: <Mic2 className="w-4 h-4" />, color: '#a78bfa' },
                { label: 'Песен', value: stats.songs, icon: <Radio className="w-4 h-4" />, color: '#60a5fa' },
                { label: 'Туров', value: stats.tours, icon: <MapPin className="w-4 h-4" />, color: '#fb923c' },
              ].map(({ label, value, icon, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span style={{ color }}>{icon}</span>
                    <span className="text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  </div>
                  <span className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Правая колонка — редактирование */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <h2 className="text-[15px] font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>Личные данные</h2>

            <div className="space-y-5">
              {/* Имя */}
              <div>
                <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  <span className="flex items-center gap-2"><User className="w-3.5 h-3.5" />Имя</span>
                </label>
                <input
                  className="input-base"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ваше имя"
                />
              </div>

              {/* Email — только чтение */}
              <div>
                <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  <span className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" />Email</span>
                </label>
                <input
                  className="input-base"
                  value={user?.email ?? ''}
                  readOnly
                  style={{ opacity: 0.6, cursor: 'not-allowed' }}
                />
                <p className="text-[12px] mt-1" style={{ color: 'var(--text-tertiary)' }}>Email изменить нельзя</p>
              </div>

              {/* Аватар URL */}
              <div>
                <label className="block text-[13px] font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  URL аватара
                </label>
                <input
                  className="input-base"
                  value={avatarUrl}
                  onChange={e => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                />
                <p className="text-[12px] mt-1" style={{ color: 'var(--text-tertiary)' }}>Ссылка на изображение аватара</p>
              </div>

              <div className="pt-2">
                <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                  <Save className="w-4 h-4" />
                  {saving ? 'Сохранение...' : 'Сохранить изменения'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}