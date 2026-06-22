export function validateRating(
  rating: number | null | undefined,
): { ok: true; value: number | null } | { ok: false; error: string } {
  if (rating == null || rating === undefined) {
    return { ok: true, value: null };
  }
  const n = Number(rating);
  if (Number.isNaN(n) || n < 1 || n > 10) {
    return { ok: false, error: 'Рейтинг должен быть от 1 до 10' };
  }
  return { ok: true, value: n };
}
