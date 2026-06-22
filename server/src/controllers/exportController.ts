import { Response } from 'express';
import ExcelJS from 'exceljs';
import { db } from '../db/pool';
import { AuthRequest } from '../middleware/authenticate';

function parseNum(v: unknown, fallback = 0): number {
  const n = parseFloat(String(v ?? fallback));
  return Number.isNaN(n) ? fallback : n;
}

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return '—';
  const str = String(d);
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const [, y, mo, day] = m;
    return new Date(Number(y), Number(mo) - 1, Number(day)).toLocaleDateString('ru-RU');
  }
  return new Date(str).toLocaleDateString('ru-RU');
}

function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80) || 'tour';
}

type StopRow = {
  city: string;
  venue: string;
  event_date: string | null;
  ticket_price: number;
};

type Finances = {
  fee: number;
  tax_percent: number;
  agent_commission_percent: number;
  transport: number;
  per_diem: number;
  hotel: number;
  other_expenses: number;
};

function calcTotals(f: Finances) {
  const taxAmount = f.fee * f.tax_percent / 100;
  const commissionAmount = f.fee * f.agent_commission_percent / 100;
  const totalExpenses = taxAmount + commissionAmount + f.transport + f.per_diem + f.hotel + f.other_expenses;
  const profit = f.fee - totalExpenses;
  return { taxAmount, commissionAmount, totalExpenses, profit };
}

function calcPerStop(f: Finances, count: number) {
  const n = Math.max(count, 1);
  const fee = f.fee / n;
  const taxAmount = fee * f.tax_percent / 100;
  const commissionAmount = fee * f.agent_commission_percent / 100;
  const transport = f.transport / n;
  const per_diem = f.per_diem / n;
  const hotel = f.hotel / n;
  const other_expenses = f.other_expenses / n;
  const profit = fee - taxAmount - commissionAmount - transport - per_diem - hotel - other_expenses;
  return { fee, taxAmount, commissionAmount, transport, per_diem, hotel, other_expenses, profit };
}

function styleHeaderRow(row: ExcelJS.Row): void {
  row.font = { bold: true };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EEF7' } };
}

export async function exportTourFinances(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const tourResult = await db.query(
      `SELECT t.program_name, t.start_date, t.end_date, t.type, t.city, t.venue,
        COALESCE(t.avg_ticket_price, 0)::numeric AS avg_ticket_price,
        COALESCE(t.fee, 0)::numeric AS fee,
        COALESCE(t.tax_percent, 0)::numeric AS tax_percent,
        COALESCE(t.agent_commission_percent, 0)::numeric AS agent_commission_percent,
        COALESCE(t.transport, 0)::numeric AS transport,
        COALESCE(t.per_diem, 0)::numeric AS per_diem,
        COALESCE(t.hotel, 0)::numeric AS hotel,
        COALESCE(t.other_expenses, 0)::numeric AS other_expenses,
        b.name AS band_name,
        s.name AS singer_name
       FROM tour t
       LEFT JOIN band b ON b.id = t.band_id
       LEFT JOIN singer s ON s.id = t.singer_id
       WHERE t.id = $1 AND t.created_by = $2`,
      [id, req.userId]
    );

    if (!tourResult.rows[0]) {
      res.status(404).json({ error: 'Тур не найден' });
      return;
    }

    const tour = tourResult.rows[0];
    const finances: Finances = {
      fee:                      parseNum(tour.fee),
      tax_percent:              parseNum(tour.tax_percent),
      agent_commission_percent: parseNum(tour.agent_commission_percent),
      transport:                parseNum(tour.transport),
      per_diem:                 parseNum(tour.per_diem),
      hotel:                    parseNum(tour.hotel),
      other_expenses:           parseNum(tour.other_expenses),
    };
    const totals = calcTotals(finances);

    let stops: StopRow[] = [];
    if (tour.type === 'tour') {
      const stopsResult = await db.query(
        `SELECT city, venue, event_date,
          COALESCE(ticket_price, 0)::numeric AS ticket_price
         FROM tour_stops WHERE tour_id = $1
         ORDER BY event_date ASC NULLS LAST`,
        [id]
      );
      stops = stopsResult.rows.map(r => ({
        city:         String(r.city ?? ''),
        venue:        String(r.venue ?? ''),
        event_date:   r.event_date ? String(r.event_date) : null,
        ticket_price: parseNum(r.ticket_price),
      }));
    } else {
      stops = [{
        city:         String(tour.city ?? ''),
        venue:        String(tour.venue ?? ''),
        event_date:   tour.start_date ? String(tour.start_date) : null,
        ticket_price: parseNum(tour.avg_ticket_price),
      }];
    }

    const performer = tour.band_name
      ? `Группа: ${tour.band_name}`
      : tour.singer_name
        ? `Исполнитель: ${tour.singer_name}`
        : '—';

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'BandManager';
    workbook.created = new Date();

    const tourSheet = workbook.addWorksheet('Тур');
    tourSheet.columns = [
      { header: 'Параметр', key: 'label', width: 28 },
      { header: 'Значение', key: 'value', width: 40 },
    ];
    styleHeaderRow(tourSheet.getRow(1));

    const tourRows = [
      { label: 'Название программы', value: tour.program_name },
      { label: 'Группа / исполнитель', value: performer },
      { label: 'Дата начала', value: formatDate(tour.start_date) },
      { label: 'Дата окончания', value: formatDate(tour.end_date) },
      { label: 'Гонорар (₽)', value: Math.round(finances.fee) },
      { label: `Налог (${finances.tax_percent}%)`, value: Math.round(totals.taxAmount) },
      { label: `Комиссия агента (${finances.agent_commission_percent}%)`, value: Math.round(totals.commissionAmount) },
      { label: 'Транспорт (₽)', value: Math.round(finances.transport) },
      { label: 'Суточные (₽)', value: Math.round(finances.per_diem) },
      { label: 'Гостиница (₽)', value: Math.round(finances.hotel) },
      { label: 'Прочие расходы (₽)', value: Math.round(finances.other_expenses) },
      { label: 'Чистая прибыль (₽)', value: Math.round(totals.profit) },
    ];
    tourRows.forEach(r => tourSheet.addRow(r));

    const profitRow = tourSheet.getRow(tourRows.length + 1);
    profitRow.font = { bold: true };

    const stopsSheet = workbook.addWorksheet('Остановки');
    stopsSheet.columns = [
      { header: 'Город', key: 'city', width: 18 },
      { header: 'Площадка', key: 'venue', width: 22 },
      { header: 'Дата', key: 'date', width: 14 },
      { header: 'Цена билета', key: 'ticket_price', width: 14 },
      { header: 'Гонорар', key: 'fee', width: 12 },
      { header: 'Налог', key: 'tax', width: 12 },
      { header: 'Комиссия', key: 'commission', width: 12 },
      { header: 'Транспорт', key: 'transport', width: 12 },
      { header: 'Суточные', key: 'per_diem', width: 12 },
      { header: 'Гостиница', key: 'hotel', width: 12 },
      { header: 'Прочие расходы', key: 'other', width: 14 },
      { header: 'Чистая прибыль', key: 'profit', width: 14 },
    ];
    styleHeaderRow(stopsSheet.getRow(1));

    const perStop = calcPerStop(finances, stops.length);
    for (const stop of stops) {
      stopsSheet.addRow({
        city:          stop.city,
        venue:         stop.venue,
        date:          formatDate(stop.event_date),
        ticket_price:  Math.round(stop.ticket_price),
        fee:           Math.round(perStop.fee),
        tax:           Math.round(perStop.taxAmount),
        commission:    Math.round(perStop.commissionAmount),
        transport:     Math.round(perStop.transport),
        per_diem:      Math.round(perStop.per_diem),
        hotel:         Math.round(perStop.hotel),
        other:         Math.round(perStop.other_expenses),
        profit:        Math.round(perStop.profit),
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `tour-${sanitizeFilename(String(tour.program_name))}-report.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('[export] exportTourFinances error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
}
