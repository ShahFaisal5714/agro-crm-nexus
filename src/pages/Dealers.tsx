import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Users } from "lucide-react";
import { useDealers } from "@/hooks/useDealers";
import { useDealerCredits } from "@/hooks/useDealerCredits";
import { AddDealerDialog } from "@/components/dealers/AddDealerDialog";
import { EditDealerDialog } from "@/components/dealers/EditDealerDialog";
import { DeleteDealerDialog } from "@/components/dealers/DeleteDealerDialog";
import { AddCreditDialog } from "@/components/dealers/AddCreditDialog";
import { AddDealerPaymentDialog } from "@/components/dealers/AddDealerPaymentDialog";
import { formatCurrency } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Territory {
  id: string;
  name: string;
  code: string;
}

const Dealers = () => {
  const { dealers, isLoading } = useDealers();
  const { dealerSummaries } = useDealerCredits();

  const { data: territories = [] } = useQuery({
    queryKey: ["territories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("territories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Territory[];
    },
  });

  const getDealerCredit = (dealerId: string) => {
    const summary = dealerSummaries.find((s) => s.dealer_id === dealerId);
    return summary?.remaining || 0;
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dealers</h1>
            <p className="text-muted-foreground mt-1">
              Manage your dealer network and credits
            </p>
          </div>
          <AddDealerDialog territories={territories} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Dealers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dealers.length}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Dealers</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : dealers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dealer Name</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Outstanding Credit</TableHead>
                    <TableHead className="w-[250px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dealers.map((dealer) => {
                    const credit = getDealerCredit(dealer.id);
                    return (
                      <TableRow key={dealer.id}>
                        <TableCell className="font-medium">
                          {dealer.dealer_name}
                        </TableCell>
                        <TableCell>{dealer.contact_person || "-"}</TableCell>
                        <TableCell>{dealer.phone || "-"}</TableCell>
                        <TableCell>{dealer.email || "-"}</TableCell>
                        <TableCell className={credit > 0 ? "text-orange-600" : "text-green-600"}>
                          {formatCurrency(credit)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <AddCreditDialog
                              dealerId={dealer.id}
                              dealerName={dealer.dealer_name}
                            />
                            <AddDealerPaymentDialog
                              dealerId={dealer.id}
                              dealerName={dealer.dealer_name}
                            />
                            <EditDealerDialog dealer={dealer} territories={territories} />
                            <DeleteDealerDialog
                              dealerId={dealer.id}
                              dealerName={dealer.dealer_name}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No dealers yet</p>
                <p className="text-sm mt-2">
                  Add your first dealer to get started
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dealers;
