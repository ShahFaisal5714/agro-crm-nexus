import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { History, RefreshCw, CheckCircle, XCircle, Clock, Database } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface BackupHistoryEntry {
  id: string;
  backup_type: string;
  status: string;
  total_records: number;
  table_counts: Record<string, number>;
  started_at: string;
  completed_at: string | null;
  is_incremental: boolean;
  incremental_since: string | null;
  notes: string | null;
  error_message: string | null;
}

export const BackupHistorySection = () => {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const { data: backupHistory, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["backup-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("backup_history")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as BackupHistoryEntry[];
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="default" className="bg-primary/20 text-primary border-primary/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case "in_progress":
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1 animate-spin" />
            In Progress
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string, isIncremental: boolean) => {
    if (isIncremental) {
      return <Badge variant="outline" className="text-blue-600 border-blue-300">Incremental</Badge>;
    }
    switch (type) {
      case "scheduled":
        return <Badge variant="outline" className="text-purple-600 border-purple-300">Scheduled</Badge>;
      case "manual":
        return <Badge variant="outline" className="text-green-600 border-green-300">Manual</Badge>;
      case "restore":
        return <Badge variant="outline" className="text-orange-600 border-orange-300">Restore</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return "—";
    const duration = new Date(end).getTime() - new Date(start).getTime();
    if (duration < 1000) return `${duration}ms`;
    if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
    return `${Math.floor(duration / 60000)}m ${Math.floor((duration % 60000) / 1000)}s`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Backup History
            </CardTitle>
            <CardDescription>
              View past backups, restores, and their status
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !backupHistory || backupHistory.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No backup history found</p>
            <p className="text-sm mt-1">Backups will appear here after you export or restore data</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Records</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backupHistory.map((entry) => (
                  <>
                    <TableRow
                      key={entry.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setExpandedRow(expandedRow === entry.id ? null : entry.id)}
                    >
                      <TableCell className="font-medium">
                        {format(new Date(entry.started_at), "MMM d, yyyy HH:mm")}
                      </TableCell>
                      <TableCell>
                        {getTypeBadge(entry.backup_type, entry.is_incremental)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(entry.status)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {entry.total_records.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatDuration(entry.started_at, entry.completed_at)}
                      </TableCell>
                    </TableRow>
                    {expandedRow === entry.id && (
                      <TableRow key={`${entry.id}-details`}>
                        <TableCell colSpan={5} className="bg-muted/30 p-4">
                          <div className="space-y-3">
                            {entry.notes && (
                              <div>
                                <span className="text-sm font-medium">Notes:</span>
                                <p className="text-sm text-muted-foreground">{entry.notes}</p>
                              </div>
                            )}
                            {entry.error_message && (
                              <div>
                                <span className="text-sm font-medium text-destructive">Error:</span>
                                <p className="text-sm text-destructive">{entry.error_message}</p>
                              </div>
                            )}
                            {entry.is_incremental && entry.incremental_since && (
                              <div>
                                <span className="text-sm font-medium">Incremental since:</span>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(entry.incremental_since), "MMM d, yyyy HH:mm")}
                                </p>
                              </div>
                            )}
                            {entry.table_counts && Object.keys(entry.table_counts).length > 0 && (
                              <div>
                                <span className="text-sm font-medium">Table breakdown:</span>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {Object.entries(entry.table_counts).map(([table, count]) => (
                                    <Badge key={table} variant="secondary" className="font-mono text-xs">
                                      {table}: {(count as number).toLocaleString()}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
