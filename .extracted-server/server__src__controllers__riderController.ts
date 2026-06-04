import { Response } from 'express';
import { db } from '../db/pool';
import { AuthRequest } from '../middleware/auth';

// GET /api/tours/:id/rider
export async function getRider(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const result = await db.query(
      'SELECT * FROM rider_checklist WHERE tour_id = $1 ORDER BY created_at ASC',
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[rider] getRider error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// POST /api/tours/:id/rider
export async function addRiderItem(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { item_name, status, photo_url, note } = req.body as {
    item_name?: string; status?: string; photo_url?: string; note?: string;
  };
  if (!item_name?.trim()) {
    res.status(400).json({ error: 'Название пункта обязательно' });
    return;
  }
  try {
    const result = await db.query(
      `INSERT INTO rider_checklist (tour_id, item_name, status, photo_url, note)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, item_name.trim(), status ?? 'pending', photo_url?.trim() ?? '', note?.trim() ?? '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[rider] addRiderItem error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// PUT /api/rider/:itemId
export async function updateRiderItem(req: AuthRequest, res: Response): Promise<void> {
  const { itemId } = req.params;
  const { item_name, status, photo_url, note } = req.body as {
    item_name?: string; status?: string; photo_url?: string; note?: string;
  };
  try {
    const result = await db.query(
      `UPDATE rider_checklist SET item_name=$1, status=$2, photo_url=$3, note=$4
       WHERE id=$5 RETURNING *`,
      [item_name?.trim() ?? '', status ?? 'pending', photo_url?.trim() ?? '', note?.trim() ?? '', itemId]
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Пункт не найден' });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[rider] updateRiderItem error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// DELETE /api/rider/:itemId
export async function deleteRiderItem(req: AuthRequest, res: Response): Promise<void> {
  const { itemId } = req.params;
  try {
    await db.query('DELETE FROM rider_checklist WHERE id = $1', [itemId]);
    res.json({ success: true });
  } catch (err) {
    console.error('[rider] deleteRiderItem error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}
```

**Файл: