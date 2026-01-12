import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calculator, Upload, Percent } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Product } from "@/hooks/useProducts";
import { formatCurrency } from "@/lib/utils";

interface BulkCostPriceUpdateDialogProps {
  products: Product[];
}

interface CsvRow {
  sku: string;
  cost_price: number;
}

export function BulkCostPriceUpdateDialog({ products }: BulkCostPriceUpdateDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [percentage, setPercentage] = useState<string>("80");
  const [csvData, setCsvData] = useState<CsvRow[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(products.map((p) => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleSelectProduct = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts((prev) => [...prev, productId]);
    } else {
      setSelectedProducts((prev) => prev.filter((id) => id !== productId));
    }
  };

  const handlePercentageUpdate = async () => {
    if (selectedProducts.length === 0) {
      toast.error("Please select at least one product");
      return;
    }

    const percentValue = parseFloat(percentage);
    if (isNaN(percentValue) || percentValue <= 0 || percentValue > 100) {
      toast.error("Please enter a valid percentage between 1 and 100");
      return;
    }

    setIsUpdating(true);
    try {
      const updates = selectedProducts.map((productId) => {
        const product = products.find((p) => p.id === productId);
        if (!product) return null;
        return {
          id: productId,
          cost_price: product.unit_price * (percentValue / 100),
        };
      }).filter(Boolean);

      for (const update of updates) {
        if (update) {
          const { error } = await supabase
            .from("products")
            .update({ cost_price: update.cost_price })
            .eq("id", update.id);

          if (error) throw error;
        }
      }

      toast.success(`Updated cost prices for ${updates.length} products`);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setOpen(false);
      setSelectedProducts([]);
    } catch (error) {
      console.error("Error updating cost prices:", error);
      toast.error("Failed to update cost prices");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split("\n").filter((line) => line.trim());
      
      // Skip header row
      const dataLines = lines.slice(1);
      const parsed: CsvRow[] = [];

      for (const line of dataLines) {
        const [sku, costPrice] = line.split(",").map((s) => s.trim());
        if (sku && costPrice) {
          const price = parseFloat(costPrice);
          if (!isNaN(price) && price > 0) {
            parsed.push({ sku, cost_price: price });
          }
        }
      }

      if (parsed.length === 0) {
        toast.error("No valid data found in CSV. Expected format: SKU,cost_price");
        return;
      }

      setCsvData(parsed);
      toast.success(`Loaded ${parsed.length} products from CSV`);
    };

    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCsvUpdate = async () => {
    if (csvData.length === 0) {
      toast.error("Please upload a CSV file first");
      return;
    }

    setIsUpdating(true);
    let updated = 0;
    let notFound = 0;

    try {
      for (const row of csvData) {
        const product = products.find((p) => p.sku.toLowerCase() === row.sku.toLowerCase());
        if (product) {
          const { error } = await supabase
            .from("products")
            .update({ cost_price: row.cost_price })
            .eq("id", product.id);

          if (error) throw error;
          updated++;
        } else {
          notFound++;
        }
      }

      toast.success(`Updated ${updated} products${notFound > 0 ? `, ${notFound} SKUs not found` : ""}`);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setOpen(false);
      setCsvData([]);
    } catch (error) {
      console.error("Error updating cost prices:", error);
      toast.error("Failed to update cost prices");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Calculator className="h-4 w-4 mr-2" />
          Bulk Update Costs
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Cost Price Update</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="percentage" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="percentage">
              <Percent className="h-4 w-4 mr-2" />
              Set as % of Selling Price
            </TabsTrigger>
            <TabsTrigger value="csv">
              <Upload className="h-4 w-4 mr-2" />
              Import from CSV
            </TabsTrigger>
          </TabsList>

          <TabsContent value="percentage" className="space-y-4">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Label htmlFor="percentage">Cost as % of Selling Price</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="percentage"
                    type="number"
                    min="1"
                    max="100"
                    value={percentage}
                    onChange={(e) => setPercentage(e.target.value)}
                    className="w-24"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
              </div>
              <Button onClick={handlePercentageUpdate} disabled={isUpdating || selectedProducts.length === 0}>
                {isUpdating ? "Updating..." : `Update ${selectedProducts.length} Products`}
              </Button>
            </div>

            <div className="border rounded-lg max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedProducts.length === products.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Current Cost</TableHead>
                    <TableHead>Selling Price</TableHead>
                    <TableHead>New Cost ({percentage}%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => {
                    const newCost = product.unit_price * (parseFloat(percentage) / 100 || 0);
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedProducts.includes(product.id)}
                            onCheckedChange={(checked) => handleSelectProduct(product.id, !!checked)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                        <TableCell>{product.name}</TableCell>
                        <TableCell>{formatCurrency(product.cost_price || 0)}</TableCell>
                        <TableCell>{formatCurrency(product.unit_price)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{formatCurrency(newCost)}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="csv" className="space-y-4">
            <div className="space-y-2">
              <Label>Upload CSV File</Label>
              <p className="text-sm text-muted-foreground">
                CSV should have two columns: SKU and cost_price (with header row)
              </p>
              <div className="flex gap-4">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="flex-1"
                />
                <Button onClick={handleCsvUpdate} disabled={isUpdating || csvData.length === 0}>
                  {isUpdating ? "Updating..." : `Apply ${csvData.length} Updates`}
                </Button>
              </div>
            </div>

            {csvData.length > 0 && (
              <div className="border rounded-lg max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>New Cost Price</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvData.map((row, index) => {
                      const product = products.find((p) => p.sku.toLowerCase() === row.sku.toLowerCase());
                      return (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-sm">{row.sku}</TableCell>
                          <TableCell>{formatCurrency(row.cost_price)}</TableCell>
                          <TableCell>
                            {product ? (
                              <Badge variant="default">Found: {product.name}</Badge>
                            ) : (
                              <Badge variant="destructive">SKU not found</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
