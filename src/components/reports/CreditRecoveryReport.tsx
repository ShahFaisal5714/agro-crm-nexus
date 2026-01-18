import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Users, MapPin, UserCheck, TrendingUp, Search, CreditCard, Wallet, ArrowDownRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useCreditRecovery } from "@/hooks/useCreditRecovery";
import { DateRange } from "react-day-picker";

interface CreditRecoveryReportProps {
  dateRange?: DateRange;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export const CreditRecoveryReport = ({ dateRange }: CreditRecoveryReportProps) => {
  const [activeView, setActiveView] = useState<"dealer" | "territory" | "officer">("dealer");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTerritory, setSelectedTerritory] = useState<string>("all");
  const [selectedOfficer, setSelectedOfficer] = useState<string>("all");

  const {
    isLoading,
    dealerRecoveryData,
    territoryRecoveryData,
    salesOfficerRecoveryData,
    summary,
    territories,
    profiles,
  } = useCreditRecovery({
    dateFrom: dateRange?.from,
    dateTo: dateRange?.to,
  });

  // Filter dealer data
  const filteredDealerData = useMemo(() => {
    let filtered = dealerRecoveryData;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(d => 
        d.dealer_name.toLowerCase().includes(term) ||
        d.territory_name.toLowerCase().includes(term)
      );
    }
    
    if (selectedTerritory && selectedTerritory !== "all") {
      filtered = filtered.filter(d => d.territory_id === selectedTerritory);
    }
    
    if (selectedOfficer && selectedOfficer !== "all") {
      filtered = filtered.filter(d => 
        d.payments.some(p => p.created_by === selectedOfficer)
      );
    }
    
    return filtered.sort((a, b) => b.total_recovered - a.total_recovered);
  }, [dealerRecoveryData, searchTerm, selectedTerritory, selectedOfficer]);

  // Chart data for territory comparison
  const territoryChartData = useMemo(() => {
    return territoryRecoveryData.slice(0, 10).map(t => ({
      name: t.territory_name.length > 15 ? t.territory_name.slice(0, 15) + "..." : t.territory_name,
      recovered: t.total_recovered,
      remaining: t.remaining,
    }));
  }, [territoryRecoveryData]);

  // Chart data for officer comparison
  const officerChartData = useMemo(() => {
    return salesOfficerRecoveryData.slice(0, 10).map(o => ({
      name: o.officer_name.length > 15 ? o.officer_name.slice(0, 15) + "..." : o.officer_name,
      recovered: o.total_recovered,
      payments: o.payment_count,
    }));
  }, [salesOfficerRecoveryData]);

  // Pie chart data for recovery status
  const recoveryStatusData = useMemo(() => [
    { name: "Recovered", value: summary.totalRecovered, color: "hsl(var(--chart-2))" },
    { name: "Remaining", value: summary.totalRemaining, color: "hsl(var(--destructive))" },
  ], [summary]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Credit Given</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalCredit)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              From {summary.dealerCount} dealers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Recovered</CardTitle>
            <Wallet className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalRecovered)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              In selected period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(summary.totalRemaining)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Still pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Recovery Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{summary.overallRecoveryRate.toFixed(1)}%</div>
            <Progress value={summary.overallRecoveryRate} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recovery Status Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recovery Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={recoveryStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {recoveryStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Territory Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm">Recovery by Territory</CardTitle>
          </CardHeader>
          <CardContent>
            {territoryChartData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No data available</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={territoryChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                  <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="recovered" name="Recovered" fill="hsl(var(--chart-2))" />
                  <Bar dataKey="remaining" name="Remaining" fill="hsl(var(--destructive))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Views */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              Credit Recovery Details
            </CardTitle>
            
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
              
              <Select value={selectedTerritory} onValueChange={setSelectedTerritory}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Territory" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Territories</SelectItem>
                  {territories.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedOfficer} onValueChange={setSelectedOfficer}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Sales Officer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Officers</SelectItem>
                  {profiles.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeView} onValueChange={(v) => setActiveView(v as typeof activeView)}>
            <TabsList>
              <TabsTrigger value="dealer" className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                By Dealer
              </TabsTrigger>
              <TabsTrigger value="territory" className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                By Territory
              </TabsTrigger>
              <TabsTrigger value="officer" className="flex items-center gap-1">
                <UserCheck className="h-4 w-4" />
                By Sales Officer
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dealer" className="mt-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dealer</TableHead>
                      <TableHead>Territory</TableHead>
                      <TableHead className="text-right">Total Credit</TableHead>
                      <TableHead className="text-right">Recovered</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                      <TableHead className="text-right">Recovery Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDealerData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No dealer data found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDealerData.map(dealer => (
                        <TableRow key={dealer.dealer_id}>
                          <TableCell className="font-medium">{dealer.dealer_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{dealer.territory_name}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(dealer.total_credit)}</TableCell>
                          <TableCell className="text-right text-green-600 font-medium">
                            {formatCurrency(dealer.total_recovered)}
                          </TableCell>
                          <TableCell className="text-right text-destructive">
                            {formatCurrency(dealer.remaining)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Progress value={dealer.recovery_rate} className="w-16 h-2" />
                              <span className="text-sm w-12">{dealer.recovery_rate.toFixed(0)}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="territory" className="mt-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Territory</TableHead>
                      <TableHead className="text-right">Dealers</TableHead>
                      <TableHead className="text-right">Total Credit</TableHead>
                      <TableHead className="text-right">Recovered</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                      <TableHead className="text-right">Recovery Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {territoryRecoveryData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No territory data found
                        </TableCell>
                      </TableRow>
                    ) : (
                      territoryRecoveryData.map(territory => (
                        <TableRow key={territory.territory_id}>
                          <TableCell className="font-medium">{territory.territory_name}</TableCell>
                          <TableCell className="text-right">{territory.dealer_count}</TableCell>
                          <TableCell className="text-right">{formatCurrency(territory.total_credit)}</TableCell>
                          <TableCell className="text-right text-green-600 font-medium">
                            {formatCurrency(territory.total_recovered)}
                          </TableCell>
                          <TableCell className="text-right text-destructive">
                            {formatCurrency(territory.remaining)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Progress value={territory.recovery_rate} className="w-16 h-2" />
                              <span className="text-sm w-12">{territory.recovery_rate.toFixed(0)}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="officer" className="mt-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sales Officer</TableHead>
                        <TableHead className="text-right">Payments</TableHead>
                        <TableHead className="text-right">Total Recovered</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesOfficerRecoveryData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                            No sales officer data found
                          </TableCell>
                        </TableRow>
                      ) : (
                        salesOfficerRecoveryData.map(officer => (
                          <TableRow key={officer.officer_id}>
                            <TableCell className="font-medium">{officer.officer_name}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant="secondary">{officer.payment_count}</Badge>
                            </TableCell>
                            <TableCell className="text-right text-green-600 font-medium">
                              {formatCurrency(officer.total_recovered)}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Recovery by Sales Officer</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {officerChartData.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">No data available</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={officerChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" fontSize={12} angle={-45} textAnchor="end" height={80} />
                          <YAxis tickFormatter={(v) => formatCurrency(v)} />
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Bar dataKey="recovered" name="Recovered" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
