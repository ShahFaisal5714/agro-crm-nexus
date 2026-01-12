import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn, formatCurrency } from "@/lib/utils";
import { useDealers } from "@/hooks/useDealers";
import { useProducts } from "@/hooks/useProducts";
import { useSalesOrders, SalesOrderItem } from "@/hooks/useSalesOrders";

const formSchema = z.object({
  dealerId: z.string().min(1, "Please select a dealer"),
  orderDate: z.date(),
  notes: z.string().optional(),
});

export const NewSalesOrderDialog = () => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SalesOrderItem[]>([]);
  const { dealers } = useDealers();
  const { products } = useProducts();
  const { createOrder, isCreating } = useSalesOrders();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      orderDate: new Date(),
      notes: "",
    },
  });

  const addItem = () => {
    setItems([
      ...items,
      { product_id: "", quantity: 1, unit_price: 0, total: 0 },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (
    index: number,
    field: keyof SalesOrderItem,
    value: string | number
  ) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === "product_id") {
      const product = products.find((p) => p.id === value);
      if (product) {
        newItems[index].unit_price = product.unit_price;
        newItems[index].total = product.unit_price * newItems[index].quantity;
      }
    } else if (field === "quantity" || field === "unit_price") {
      newItems[index].total = newItems[index].quantity * newItems[index].unit_price;
    }

    setItems(newItems);
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (items.length === 0) {
      form.setError("dealerId", { message: "Add at least one product" });
      return;
    }

    if (items.some((item) => !item.product_id)) {
      form.setError("dealerId", { message: "Select products for all items" });
      return;
    }

    // Stock validation - check if any item exceeds available stock
    const stockErrors: string[] = [];
    for (const item of items) {
      const product = products.find((p) => p.id === item.product_id);
      if (product && item.quantity > product.stock_quantity) {
        stockErrors.push(
          `${product.name}: Requested ${item.quantity} but only ${product.stock_quantity} in stock`
        );
      }
    }

    if (stockErrors.length > 0) {
      form.setError("dealerId", { 
        message: `Insufficient stock: ${stockErrors.join("; ")}` 
      });
      return;
    }

    await createOrder({
      dealerId: values.dealerId,
      orderDate: format(values.orderDate, "yyyy-MM-dd"),
      notes: values.notes,
      items,
    });

    setOpen(false);
    form.reset();
    setItems([]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Sales Order
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Sales Order</DialogTitle>
          <DialogDescription>
            Add a new sales order for a dealer
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dealerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dealer</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select dealer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {dealers.map((dealer) => (
                          <SelectItem key={dealer.id} value={dealer.id}>
                            {dealer.dealer_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="orderDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Order Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Order Items</h3>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <Select
                      value={item.product_id}
                      onValueChange={(value) =>
                        updateItem(index, "product_id", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} {product.pack_size ? `(${product.pack_size})` : ""} - {formatCurrency(product.unit_price)}
                            <span className={`ml-2 text-xs ${product.stock_quantity <= 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                              (Stock: {product.stock_quantity})
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(index, "quantity", parseInt(e.target.value) || 0)
                      }
                      min={1}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Price"
                      value={item.unit_price}
                      onChange={(e) =>
                        updateItem(index, "unit_price", parseFloat(e.target.value) || 0)
                      }
                      step="0.01"
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Total"
                      value={item.total.toFixed(2)}
                      readOnly
                      disabled
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}

              {items.length > 0 && (
                <div className="flex justify-end pt-4 border-t">
                  <div className="text-lg font-semibold">
                    Total: {formatCurrency(items.reduce((sum, item) => sum + item.total, 0))}
                  </div>
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Creating..." : "Create Order"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
