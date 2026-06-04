-- Профиль пользователя
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS name       TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '';
```

---

## Серверные файлы

**Файл: