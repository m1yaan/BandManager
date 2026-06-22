import { Response } from 'express';
import { db } from '../db/pool';
import { AuthRequest } from '../middleware/authenticate';
import { logAction, getAuditContext } from '../middleware/auditMiddleware';

// Пересчёт rider_status тура
async function recalcRiderStatus(tourId: string): Promise<void> {
  const items = await db.query(
    'SELECT status FROM rider_checklist WHERE tour_id=$1',
    [tourId]
  );
  let status: 'empty' | 'partial' | 'complete' = 'empty';
  if (items.rows.length > 0) {
    const confirmed = items.rows.filter((r: { status: string }) => r.status === 'confirmed').length;
    status = confirmed === items.rows.length ? 'complete' : 'partial';
  }
  await db.query('UPDATE tour SET rider_status=$1 WHERE id=$2', [status, tourId]);
}

// GET /api/tours/:id/rider
export async function getRider(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    // Проверяем доступ к туру
    const access = await db.query('SELECT id FROM tour WHERE id=$1 AND created_by=$2', [id, req.userId]);
    if (access.rowCount === 0) { res.status(404).json({ error: 'Тур не найден' }); return; }

    const result = await db.query(
      'SELECT * FROM rider_checklist WHERE tour_id=$1 ORDER BY created_at ASC',
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
    const access = await db.query('SELECT id FROM tour WHERE id=$1 AND created_by=$2', [id, req.userId]);
    if (access.rowCount === 0) { res.status(404).json({ error: 'Тур не найден' }); return; }

    const result = await db.query(
      `INSERT INTO rider_checklist (tour_id, item_name, status, photo_url, note)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, item_name.trim(), status ?? 'pending', photo_url?.trim() ?? '', note?.trim() ?? '']
    );
    await recalcRiderStatus(id);
    const item = result.rows[0];
    logAction(req.userId!, 'CREATE', 'rider_checklist', item.id, null, req.body, getAuditContext(req));
    res.status(201).json(item);
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
    // Получаем item + проверяем доступ через тур
    const existing = await db.query(
      `SELECT rc.*, t.created_by FROM rider_checklist rc
       JOIN tour t ON t.id = rc.tour_id
       WHERE rc.id=$1`,
      [itemId]
    );
    if (!existing.rows[0] || existing.rows[0].created_by !== req.userId) {
      res.status(404).json({ error: 'Пункт не найден' });
      return;
    }

    const result = await db.query(
      `UPDATE rider_checklist SET item_name=$1, status=$2, photo_url=$3, note=$4
       WHERE id=$5 RETURNING *`,
      [item_name?.trim() ?? existing.rows[0].item_name, status ?? existing.rows[0].status,
       photo_url?.trim() ?? '', note?.trim() ?? '', itemId]
    );
    await recalcRiderStatus(existing.rows[0].tour_id);
    const oldItem = { ...existing.rows[0] };
    delete oldItem.created_by;
    logAction(req.userId!, 'UPDATE', 'rider_checklist', itemId, oldItem, req.body, getAuditContext(req));
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
    const existing = await db.query(
      `SELECT rc.*, t.created_by FROM rider_checklist rc
       JOIN tour t ON t.id = rc.tour_id WHERE rc.id=$1`,
      [itemId]
    );
    if (!existing.rows[0] || existing.rows[0].created_by !== req.userId) {
      res.status(404).json({ error: 'Пункт не найден' });
      return;
    }
    const oldItem = { ...existing.rows[0] };
    delete oldItem.created_by;
    await db.query('DELETE FROM rider_checklist WHERE id=$1', [itemId]);
    await recalcRiderStatus(existing.rows[0].tour_id);
    logAction(req.userId!, 'DELETE', 'rider_checklist', itemId, oldItem, null, getAuditContext(req));
    res.json({ success: true });
  } catch (err) {
    console.error('[rider] deleteRiderItem error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}
