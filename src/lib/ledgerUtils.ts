import { format } from "date-fns";
import { DealerCredit, DealerPayment } from "@/hooks/useDealerCredits";
import { formatCurrency } from "@/lib/utils";
import logo from "@/assets/logo.png";

interface LedgerEntry {
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export const generateDealerLedgerPDF = (
  dealerName: string,
  credits: DealerCredit[],
  payments: DealerPayment[],
  totalCredit: number,
  totalPaid: number,
  remaining: number,
  mode: "download" | "print" = "download"
) => {
  // Build ledger entries sorted by date ascending
  const entries: LedgerEntry[] = [];

  const rawEntries = [
    ...credits.map((c) => {
      const productInfo = c.products
        ? [c.products.name, c.products.sku ? `Batch: ${c.products.sku}` : "", c.products.pack_size ? `Pack: ${c.products.pack_size}` : ""]
            .filter(Boolean)
            .join(" | ")
        : "";
      const qty = c.products?.unit_price ? Math.round(c.amount / c.products.unit_price) : null;
      const desc = [
        "Credit",
        productInfo ? `- ${productInfo}` : "",
        qty ? `(Qty: ${qty})` : "",
        c.description ? `| ${c.description}` : "",
      ].filter(Boolean).join(" ");
      return { date: c.credit_date, description: desc, debit: c.amount, credit: 0, sortKey: new Date(c.credit_date).getTime() };
    }),
    ...payments.map((p) => {
      const desc = [
        `Payment (${p.payment_method.replace("_", " ")})`,
        p.reference_number ? `Ref: ${p.reference_number}` : "",
        p.notes ? `| ${p.notes}` : "",
      ].filter(Boolean).join(" ");
      return { date: p.payment_date, description: desc, debit: 0, credit: p.amount, sortKey: new Date(p.payment_date).getTime() };
    }),
  ].sort((a, b) => a.sortKey - b.sortKey);

  let runningBalance = 0;
  for (const entry of rawEntries) {
    runningBalance += entry.debit - entry.credit;
    entries.push({
      date: entry.date,
      description: entry.description,
      debit: entry.debit,
      credit: entry.credit,
      balance: runningBalance,
    });
  }

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>Ledger - ${dealerName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1a1a1a; font-size: 12px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #16a34a; padding-bottom: 15px; margin-bottom: 20px; }
    .company { display: flex; align-items: center; gap: 12px; }
    .company-name { font-size: 22px; font-weight: 700; color: #16a34a; }
    .company-sub { font-size: 11px; color: #666; }
    .doc-info { text-align: right; }
    .doc-title { font-size: 18px; font-weight: 700; color: #333; text-transform: uppercase; letter-spacing: 1px; }
    .doc-date { font-size: 11px; color: #666; margin-top: 4px; }
    .dealer-info { background: #f8faf8; border: 1px solid #e0e7e0; border-radius: 6px; padding: 12px 16px; margin-bottom: 20px; }
    .dealer-name { font-size: 16px; font-weight: 600; }
    .summary-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 20px; }
    .summary-card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; text-align: center; }
    .summary-card.debit { border-left: 4px solid #ea580c; }
    .summary-card.credit { border-left: 4px solid #16a34a; }
    .summary-card.balance { border-left: 4px solid ${remaining > 0 ? '#ea580c' : '#16a34a'}; }
    .summary-label { font-size: 10px; text-transform: uppercase; color: #666; letter-spacing: 0.5px; }
    .summary-value { font-size: 18px; font-weight: 700; margin-top: 4px; }
    .summary-value.debit { color: #ea580c; }
    .summary-value.credit { color: #16a34a; }
    .summary-value.balance { color: ${remaining > 0 ? '#ea580c' : '#16a34a'}; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th { background: #1e293b; color: white; padding: 8px 10px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
    th:nth-child(1) { width: 12%; }
    th:nth-child(3), th:nth-child(4), th:nth-child(5) { text-align: right; width: 14%; }
    td { padding: 7px 10px; border-bottom: 1px solid #e5e7eb; }
    td:nth-child(3), td:nth-child(4), td:nth-child(5) { text-align: right; font-family: 'Courier New', monospace; }
    tr:nth-child(even) { background: #f9fafb; }
    .debit-cell { color: #ea580c; font-weight: 500; }
    .credit-cell { color: #16a34a; font-weight: 500; }
    .balance-cell { font-weight: 700; }
    .balance-positive { color: #ea580c; }
    .balance-zero { color: #16a34a; }
    .footer { margin-top: 30px; border-top: 2px solid #e5e7eb; padding-top: 12px; display: flex; justify-content: space-between; font-size: 10px; color: #999; }
    .total-row td { border-top: 2px solid #1e293b; font-weight: 700; font-size: 13px; background: #f1f5f9; }
    @media print {
      body { padding: 15px; }
      .header { page-break-after: avoid; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company">
      <div>
        <div class="company-name">Agraicy</div>
        <div class="company-sub">Life Sciences</div>
      </div>
    </div>
    <div class="doc-info">
      <div class="doc-title">Account Ledger</div>
      <div class="doc-date">Generated: ${format(new Date(), "dd MMM yyyy, hh:mm a")}</div>
    </div>
  </div>

  <div class="dealer-info">
    <div class="dealer-name">${dealerName}</div>
  </div>

  <div class="summary-grid">
    <div class="summary-card debit">
      <div class="summary-label">Total Credit (Debit)</div>
      <div class="summary-value debit">${formatCurrency(totalCredit)}</div>
    </div>
    <div class="summary-card credit">
      <div class="summary-label">Total Paid (Credit)</div>
      <div class="summary-value credit">${formatCurrency(totalPaid)}</div>
    </div>
    <div class="summary-card balance">
      <div class="summary-label">Outstanding Balance</div>
      <div class="summary-value balance">${formatCurrency(remaining)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Description</th>
        <th>Debit (₹)</th>
        <th>Credit (₹)</th>
        <th>Balance (₹)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>-</td>
        <td><strong>Opening Balance</strong></td>
        <td>-</td>
        <td>-</td>
        <td class="balance-cell balance-zero">${formatCurrency(0)}</td>
      </tr>
      ${entries.map((e) => `
      <tr>
        <td>${format(new Date(e.date), "dd MMM yyyy")}</td>
        <td>${e.description}</td>
        <td class="debit-cell">${e.debit > 0 ? formatCurrency(e.debit) : "-"}</td>
        <td class="credit-cell">${e.credit > 0 ? formatCurrency(e.credit) : "-"}</td>
        <td class="balance-cell ${e.balance > 0 ? "balance-positive" : "balance-zero"}">${formatCurrency(e.balance)}</td>
      </tr>`).join("")}
      <tr class="total-row">
        <td></td>
        <td>TOTAL</td>
        <td class="debit-cell">${formatCurrency(totalCredit)}</td>
        <td class="credit-cell">${formatCurrency(totalPaid)}</td>
        <td class="balance-cell ${remaining > 0 ? "balance-positive" : "balance-zero"}">${formatCurrency(remaining)}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <div>Agraicy Life Sciences - Dealer Ledger Statement</div>
    <div>This is a computer-generated document. No signature required.</div>
  </div>
</body>
</html>`;

  if (mode === "print") {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
  } else {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${dealerName.replace(/\s+/g, "_")}_ledger_${format(new Date(), "yyyy-MM-dd")}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};
