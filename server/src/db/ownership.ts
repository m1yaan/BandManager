/**
 * Visibility filter: own records, records of managed artists, and (for artists) manager's records.
 */
export function ownershipFilter(alias?: string, param = '$1'): string {
  const col = alias ? `${alias}.created_by` : 'created_by';
  return `(
    ${col} = ${param}
    OR ${col} IN (SELECT id FROM users WHERE managed_by = ${param})
    OR ${col} = (SELECT managed_by FROM users WHERE id = ${param} AND managed_by IS NOT NULL)
  )`;
}

/** Same as ownershipFilter but compares against another column (e.g. m.user_id). */
export function ownershipFilterColumn(alias: string | undefined, userIdColumn: string): string {
  const col = alias ? `${alias}.created_by` : 'created_by';
  return `(
    ${col} = ${userIdColumn}
    OR ${col} IN (SELECT id FROM users WHERE managed_by = ${userIdColumn})
    OR ${col} = (SELECT managed_by FROM users WHERE id = ${userIdColumn} AND managed_by IS NOT NULL)
  )`;
}

export function userScopeFilter(userIdColumn: string, param = '$1'): string {
  return `(
    ${userIdColumn} = ${param}
    OR ${userIdColumn} IN (SELECT id FROM users WHERE managed_by = ${param})
    OR ${userIdColumn} = (SELECT managed_by FROM users WHERE id = ${param} AND managed_by IS NOT NULL)
  )`;
}
