/**
 * Single source of truth for dealer credit balance math.
 *
 * The authoritative aggregation lives in the database function
 * `public.get_dealer_balances(p_dealer_id, p_from, p_to)`. The helpers below
 * mirror that exact logic (same rounding, same sign convention, no clamping)
 * so that any client-side derivation — Dashboard widget, ledger screen,
 * PDF/CSV export — always agrees with the backend result.
 */

/** Round a money value to PKR 2 decimals (half-up, matching Postgres ROUND). */
export const roundPKR = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  const sign = value < 0 ? -1 : 1;
  return (sign * Math.round((Math.abs(value) + Number.EPSILON) * 100)) / 100;
};

export interface DealerBalance {
  dealer_id: string;
  dealer_name: string;
  territory_name: string | null;
  territory_code: string | null;
  total_credit: number;
  total_paid: number;
  remaining: number;
  last_payment_date: string | null;
}

interface AmountRow {
  amount: number | string;
}

/**
 * Compute one dealer's balance from raw credit/payment rows.
 * Never clamps negatives — an overpaid dealer legitimately has a negative
 * remaining balance and every view must show the same number.
 */
export const computeDealerBalance = (
  credits: AmountRow[],
  payments: (AmountRow & { payment_date?: string })[]
): { total_credit: number; total_paid: number; remaining: number; last_payment_date: string | null } => {
  const total_credit = roundPKR(credits.reduce((sum, c) => sum + Number(c.amount), 0));
  const total_paid = roundPKR(payments.reduce((sum, p) => sum + Number(p.amount), 0));
  const last_payment_date = payments.reduce<string | null>((latest, p) => {
    if (!p.payment_date) return latest;
    return !latest || p.payment_date > latest ? p.payment_date : latest;
  }, null);

  return { total_credit, total_paid, remaining: roundPKR(total_credit - total_paid), last_payment_date };
};

/** Sum a set of dealer balances (used by Dashboard, KPI cards and exports). */
export const sumRemaining = (balances: Pick<DealerBalance, "remaining">[]): number =>
  roundPKR(balances.reduce((sum, b) => sum + b.remaining, 0));

export const sumTotalCredit = (balances: Pick<DealerBalance, "total_credit">[]): number =>
  roundPKR(balances.reduce((sum, b) => sum + b.total_credit, 0));

export const sumTotalPaid = (balances: Pick<DealerBalance, "total_paid">[]): number =>
  roundPKR(balances.reduce((sum, b) => sum + b.total_paid, 0));

/**
 * Running balance used by the ledger PDF. Returns the closing balance, which
 * must equal `computeDealerBalance(...).remaining` for the same rows.
 */
export const computeLedgerClosingBalance = (
  rows: { debit: number; credit: number }[]
): number => roundPKR(rows.reduce((balance, r) => balance + r.debit - r.credit, 0));
