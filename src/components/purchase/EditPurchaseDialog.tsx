import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
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
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Purchase, usePurchases } from "@/hooks/usePurchases";
import { useSuppliers } from "@/hooks/useSuppliers";
import { SupplierRatingStars } from "./SupplierRatingStars";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  supplier_id: z.string().min(1, "Supplier is required"),
  purchase_date: z.date(),
  status: z.string().min(1, "Status is required"),
  notes: z.string().optional(),
});

interface EditPurchaseDialogProps {
  purchase: Purchase;
}

export const EditPurchaseDialog = ({ purchase }: EditPurchaseDialogProps) => {
  const [open, setOpen] = useState(false);
  const { updatePurchase, isUpdating } = usePurchases();
  const { suppliers } = useSuppliers();
  const [qualityRating, setQualityRating] = useState<number>(purchase.quality_rating || 0);
  const [deliveryRating, setDeliveryRating] = useState<number>(purchase.delivery_rating || 0);
  const [priceRating, setPriceRating] = useState<number>(purchase.price_rating || 0);
  const [supplierNotes, setSupplierNotes] = useState(purchase.supplier_notes || "");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      supplier_id: purchase.supplier_id,
      purchase_date: new Date(purchase.purchase_date),
      status: purchase.status,
      notes: purchase.notes || "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    await updatePurchase({
      id: purchase.id,
      supplier_id: values.supplier_id,
      purchase_date: format(values.purchase_date, "yyyy-MM-dd"),
      status: values.status,
      notes: values.notes,
      quality_rating: qualityRating || null,
      delivery_rating: deliveryRating || null,
      price_rating: priceRating || null,
      supplier_notes: supplierNotes || null,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Purchase Order</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="supplier_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {suppliers?.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
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
              name="purchase_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Purchase Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
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
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any notes..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Supplier Rating Section */}
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              <Label className="font-semibold text-sm">Supplier Rating</Label>
              <div className="grid grid-cols-3 gap-4">
                <SupplierRatingStars rating={qualityRating} onChange={setQualityRating} label="Quality" />
                <SupplierRatingStars rating={deliveryRating} onChange={setDeliveryRating} label="Delivery" />
                <SupplierRatingStars rating={priceRating} onChange={setPriceRating} label="Price" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplierNotes">Supplier Notes</Label>
                <Textarea
                  id="supplierNotes"
                  value={supplierNotes}
                  onChange={(e) => setSupplierNotes(e.target.value)}
                  placeholder="Notes about supplier performance..."
                  className="resize-none"
                  maxLength={1000}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
