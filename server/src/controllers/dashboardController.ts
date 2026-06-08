import { Response } from 'express';
import { db } from '../db/pool';
import { AuthRequest } from '../middleware/auth';

// GET /api/dashboard/financials — реальные данные туров для графика
export async function getFinancials(req: AuthRequest, res: Response): Promise<void> {
  try {
    // Получаем туры за последние 6 месяцев
    const result = await db.query(
      `SELECT
         TO_CHAR(COALESCE(t.start_date, t.created_at::date), 'Mon') AS month,
         EXTRACT(MONTH FROM COALESCE(t.start_date, t.created_at::date)) AS month_num,
         EXTRACT(YEAR FROM COALESCE(t.start_date, t.created_at::date)) AS year,
         SUM(t.fee) AS total_income,
         SUM(
           COALESCE(t.tax_percent,0)/100.0 * t.fee +
           COALESCE(t.agent_commission_percent,0)/100.0 * t.fee +
           COALESCE(t.transport,0) +
           COALESCE(t.per_diem,0) +
           COALESCE(t.hotel,0) +
           COALESCE(t.other_expenses,0)
         ) AS total_expenses
       FROM tour t
       WHERE t.created_by = $1
         AND COALESCE(t.start_date, t.created_at::date) >= NOW() - INTERVAL '6 months'
       GROUP BY month, month_num, year
       ORDER BY year ASC, month_num ASC`,
      [req.userId]
    );

    const data = result.rows.map(r => ({
      month:    r.month,
      доходы:   Math.round(parseFloat(r.total_income ?? '0')),
      расходы:  Math.round(parseFloat(r.total_expenses ?? '0')),
      прибыль:  Math.round(parseFloat(r.total_income ?? '0') - parseFloat(r.total_expenses ?? '0')),
    }));

    // Если данных нет — возвращаем пустой массив (frontend отобразит empty state)
    res.json(data);
  } catch (err) {
    console.error('[dashboard] getFinancials error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}

// GET /api/dashboard/rider-attention — туры требующие заполнения райдера
export async function getRiderAttention(req: AuthRequest, res: Response): Promise<void> {
  try {
    const result = await db.query(
      `SELECT t.id, t.program_name, t.city, t.start_date, t.rider_status,
              b.name AS band_name
       FROM tour t
       LEFT JOIN band b ON b.id = t.band_id
       WHERE t.created_by = $1
         AND t.rider_status IN ('empty', 'partial')
         AND t.start_date IS NOT NULL
         AND t.start_date >= NOW()
       ORDER BY t.start_date ASC
       LIMIT 5`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[dashboard] getRiderAttention error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}
