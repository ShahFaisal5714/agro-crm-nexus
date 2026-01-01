import { useState } from "react";
import { format } from "date-fns";
import { useAuditLogs, AUDIT_ACTIONS, ENTITY_TYPES } from "@/hooks/useAuditLogs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Calendar as CalendarIcon, RefreshCw, FileText, UserPlus, UserMinus, Shield, Download } from "lucide-react";
import { cn } from "@/lib/utils";

const actionIcons: Record<string, typeof UserPlus> = {
  user_created: UserPlus,
  user_deleted: UserMinus,
  role_changed: Shield,
  data_exported: Download,
};

const actionColors: Record<string, string> = {
  user_created: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  user_deleted: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  role_changed: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  data_exported: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
};

export const AuditLogViewer = () => {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();

  const { auditLogs, isLoading, refetch } = useAuditLogs({
    action: actionFilter !== "all" ? actionFilter : undefined,
    entityType: entityFilter !== "all" ? entityFilter : undefined,
    startDate,
    endDate,
  });

  const formatActionLabel = (action: string) => {
    return action.split("_").map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(" ");
  };

  const getActionIcon = (action: string) => {
    const Icon = actionIcons[action] || FileText;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Audit Logs
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {Object.values(AUDIT_ACTIONS).map((action) => (
                <SelectItem key={action} value={action}>
                  {formatActionLabel(action)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by entity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              {Object.values(ENTITY_TYPES).map((entity) => (
                <SelectItem key={entity} value={entity}>
                  {entity.charAt(0).toUpperCase() + entity.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn(!startDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, "PPP") : "Start date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={setStartDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn(!endDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, "PPP") : "End date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={setEndDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {(startDate || endDate || actionFilter !== "all" || entityFilter !== "all") && (
            <Button
              variant="ghost"
              onClick={() => {
                setActionFilter("all");
                setEntityFilter("all");
                setStartDate(undefined);
                setEndDate(undefined);
              }}
            >
              Clear filters
            </Button>
          )}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading audit logs...</div>
        ) : auditLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No audit logs found matching your filters.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(log.created_at), "PPp")}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {log.user_email}
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("gap-1", actionColors[log.action] || "")}>
                        {getActionIcon(log.action)}
                        {formatActionLabel(log.action)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {log.entity_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      {log.details ? (
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {JSON.stringify(log.details, null, 0).slice(0, 100)}
                          {JSON.stringify(log.details).length > 100 ? "..." : ""}
                        </code>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};