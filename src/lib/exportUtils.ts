import { format } from "date-fns";

// CSV Export
export const exportToCSV = (data: Record<string, unknown>[], filename: string, headers?: string[]) => {
  if (data.length === 0) return;

  const keys = headers || Object.keys(data[0]);
  const csvHeader = keys.join(",");
  const csvRows = data.map(row => 
    keys.map(key => {
      const value = row[key];
      if (value === null || value === undefined) return "";
      const stringValue = String(value);
      // Escape quotes and wrap in quotes if contains comma or newline
      if (stringValue.includes(",") || stringValue.includes("\n") || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(",")
  );

  const csvContent = [csvHeader, ...csvRows].join("\n");
  downloadFile(csvContent, `${filename}_${format(new Date(), "yyyy-MM-dd")}.csv`, "text/csv");
};

// PDF Export (download as HTML file, with print option)
export const exportToPDF = (
  title: string,
  data: Record<string, unknown>[],
  columns: { key: string; label: string; format?: (value: unknown) => string }[],
  filename: string,
  summary?: { label: string; value: string }[]
) => {
  const htmlContent = generatePDFHtml(title, data, columns, summary);
  downloadFile(htmlContent, `${filename}_${format(new Date(), "yyyy-MM-dd")}.html`, "text/html");
};

// Print PDF (opens print preview)
export const printPDF = (
  title: string,
  data: Record<string, unknown>[],
  columns: { key: string; label: string; format?: (value: unknown) => string }[],
  summary?: { label: string; value: string }[]
) => {
  const htmlContent = generatePDFHtml(title, data, columns, summary);
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  }
};

const generatePDFHtml = (
  title: string,
  data: Record<string, unknown>[],
  columns: { key: string; label: string; format?: (value: unknown) => string }[],
  summary?: { label: string; value: string }[]
) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .meta { color: #666; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f4f4f4; font-weight: bold; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .summary { margin-top: 20px; padding: 15px; background: #f4f4f4; border-radius: 8px; }
        .summary-item { display: flex; justify-content: space-between; padding: 5px 0; }
        .summary-label { font-weight: bold; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <div class="meta">Generated on: ${format(new Date(), "PPpp")}</div>
      ${summary && summary.length > 0 ? `
        <div class="summary">
          ${summary.map(s => `<div class="summary-item"><span class="summary-label">${s.label}:</span><span>${s.value}</span></div>`).join("")}
        </div>
      ` : ""}
      <table>
        <thead>
          <tr>
            ${columns.map(col => `<th>${col.label}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>
              ${columns.map(col => {
                const value = row[col.key];
                const displayValue = col.format ? col.format(value) : String(value ?? "");
                return `<td>${displayValue}</td>`;
              }).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </body>
    </html>
  `;
};

const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
