import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useExpenses } from "@/hooks/useExpenses";
import { useRegions } from "@/hooks/useRegions";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const EXPENSE_CATEGORIES = [
  "Travel",
  "Meals",
  "Accommodation",
  "Office Supplies",
  "Marketing",
  "Utilities",
  "Salaries",
  "Other",
];

export const AddExpenseDialog = () => {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [regionId, setRegionId] = useState<string>("");
  const [territoryId, setTerritoryId] = useState<string>("");
  const [assignedToName, setAssignedToName] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastSubmitRef = useRef<number>(0);

  const { createExpense } = useExpenses();
  const { regions } = useRegions();

  const { data: territories = [] } = useQuery({
    queryKey: ["territories-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("territories").select("id, name, code, region_id").order("name");
      if (error) throw error;
      return data as { id: string; name: string; code: string; region_id: string | null }[];
    },
  });

  const filteredTerritories = regionId ? territories.filter((t) => t.region_id === regionId) : territories;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !amount) return;

    const now = Date.now();
    if (now - lastSubmitRef.current < 20000) return;
    lastSubmitRef.current = now;
    setIsSubmitting(true);

    await createExpense({
      category,
      amount: parseFloat(amount),
      expense_date: expenseDate,
      description,
      region_id: regionId || undefined,
      territory_id: territoryId || undefined,
      assigned_to_name: assignedToName || undefined,
      notes: notes || undefined,
    });

    setOpen(false);
    setIsSubmitting(false);
    setCategory("");
    setAmount("");
    setDescription("");
    setRegionId("");
    setTerritoryId("");
    setAssignedToName("");
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Expense
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (PKR) *</Label>
            <Input id="amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date *</Label>
            <Input id="date" type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Region</Label>
              <Select value={regionId} onValueChange={(v) => { setRegionId(v); setTerritoryId(""); }}>
                <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
                <SelectContent>
                  {regions.map((r) => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Territory</Label>
              <Select value={territoryId} onValueChange={setTerritoryId}>
                <SelectTrigger><SelectValue placeholder="Select territory" /></SelectTrigger>
                <SelectContent>
                  {filteredTerritories.map((t) => (<SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assigned">Assigned to / Person</Label>
            <Input id="assigned" value={assignedToName} onChange={(e) => setAssignedToName(e.target.value)} placeholder="Accountant or company person name" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Expense details..." />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (PIR Book / additional info)</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes..." />
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Adding..." : "Add Expense"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
