import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

interface Column {
  key: string;
  label: string;
  format?: "currency" | "number" | "text";
  align?: "left" | "right";
}

interface ReportDetailTableProps {
  title: string;
  data: Record<string, any>[];
  columns: Column[];
  showTotal?: boolean;
  totalColumns?: string[];
}

export const ReportDetailTable = ({ title, data, columns, showTotal = true, totalColumns = [] }: ReportDetailTableProps) => {
  if (data.length === 0) return null;

  const formatValue = (value: any, format?: string) => {
    if (format === "currency") return formatCurrency(value || 0);
    if (format === "number") return (value || 0).toLocaleString();
    return value || "-";
  };

  const totals = totalColumns.length > 0 ? totalColumns.reduce((acc, key) => {
    acc[key] = data.reduce((sum, row) => sum + (Number(row[key]) || 0), 0);
    return acc;
  }, {} as Record<string, number>) : {};

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                {columns.map(col => (
                  <TableHead key={col.key} className={col.align === "right" ? "text-right" : ""}>
                    {col.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, i) => (
                <TableRow key={i}>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  {columns.map(col => (
                    <TableCell key={col.key} className={col.align === "right" ? "text-right font-medium" : ""}>
                      {formatValue(row[col.key], col.format)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {showTotal && totalColumns.length > 0 && (
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell></TableCell>
                  {columns.map(col => (
                    <TableCell key={col.key} className={col.align === "right" ? "text-right" : ""}>
                      {totalColumns.includes(col.key) ? formatValue(totals[col.key], col.format) : col.key === columns[0].key ? "Total" : ""}
                    </TableCell>
                  ))}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
