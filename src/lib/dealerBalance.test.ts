import { describe, it, expect } from "vitest";
import {
  roundPKR,
  computeDealerBalance,
  computeLedgerClosingBalance,
  sumRemaining,
  sumTotalCredit,
  sumTotalPaid,
  DealerBalance,
} from "./dealerBalance";
import { formatCurrency } from "./utils";

const credits = [
  { amount: 14000.005, credit_date: "2026-01-05" },
  { amount: 750.5, credit_date: "2026-02-11" },
  { amount: 19999.999, credit_date: "2026-03-01" },
];
const payments = [
  { amount: 10000, payment_date: "2026-01-20" },
  { amount: 4500.25, payment_date: "2026-03-15" },
];

// Ledger rows as the PDF builds them (credits = debit, payments = credit)
const ledgerRows = [
  ...credits.map((c) => ({ debit: c.amount, credit: 0 })),
  ...payments.map((p) => ({ debit: 0, credit: p.amount })),
];

describe("PKR rounding utility", () => {
  it("rounds to 2 decimals", () => {
    expect(roundPKR(14000.005)).toBe(14000.01);
    expect(roundPKR(19999.999)).toBe(20000);
    expect(roundPKR(-1234.567)).toBe(-1234.57);
  });

  it("is used by formatCurrency", () => {
    expect(formatCurrency(1234.567)).toBe(formatCurrency(roundPKR(1234.567)));
  });
});

describe("dealer balance consistency across Dashboard, ledger and PDF", () => {
  const balance = computeDealerBalance(credits, payments);

  it("ledger PDF closing balance equals the ledger screen remaining", () => {
    expect(computeLedgerClosingBalance(ledgerRows)).toBe(balance.remaining);
  });

  it("Dashboard aggregate equals the single-dealer remaining", () => {
    const dashboard: DealerBalance[] = [
      {
        dealer_id: "d1",
        dealer_name: "Dealer One",
        territory_name: null,
        territory_code: null,
        ...balance,
      },
    ];
    expect(sumRemaining(dashboard)).toBe(balance.remaining);
    expect(sumTotalCredit(dashboard)).toBe(balance.total_credit);
    expect(sumTotalPaid(dashboard)).toBe(balance.total_paid);
  });

  it("all three formatted totals are identical strings", () => {
    const dashboardText = formatCurrency(
      sumRemaining([{ remaining: balance.remaining }])
    );
    const ledgerText = formatCurrency(balance.remaining);
    const pdfText = formatCurrency(computeLedgerClosingBalance(ledgerRows));
    expect(new Set([dashboardText, ledgerText, pdfText]).size).toBe(1);
  });

  it("does not clamp negative (overpaid) balances anywhere", () => {
    const overpaid = computeDealerBalance([{ amount: 100 }], [{ amount: 250 }]);
    expect(overpaid.remaining).toBe(-150);
    expect(sumRemaining([{ remaining: overpaid.remaining }, { remaining: balance.remaining }]))
      .toBe(roundPKR(overpaid.remaining + balance.remaining));
  });

  it("tracks the latest payment date", () => {
    expect(balance.last_payment_date).toBe("2026-03-15");
  });
});
