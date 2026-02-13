import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { format, startOfMonth } from "date-fns";

interface SetOfficerTargetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  officer: {
    userId: string;
    name: string;
    territoryCode: string;
    territoryName: string;
  } | null;
  existingTarget?: {
    id: string;
    sales_target: number;
    orders_target: number;
    credits_target: number;
    payments_target: number;
    notes: string | null;
  } | null;
  targetMonth: Date;
}

export const SetOfficerTargetDialog = ({
  open,
  onOpenChange,
  officer,
  existingTarget,
  targetMonth,
}: SetOfficerTargetDialogProps) => {
  const queryClient = useQueryClient();
  const [salesTarget, setSalesTarget] = useState(String(existingTarget?.sales_target || ""));
  const [ordersTarget, setOrdersTarget] = useState(String(existingTarget?.orders_target || ""));
  const [creditsTarget, setCreditsTarget] = useState(String(existingTarget?.credits_target || ""));
  const [paymentsTarget, setPaymentsTarget] = useState(String(existingTarget?.payments_target || ""));
  const [notes, setNotes] = useState(existingTarget?.notes || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!officer) return;
    setSaving(true);

    const monthStr = format(startOfMonth(targetMonth), "yyyy-MM-dd");
    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      user_id: officer.userId,
      territory_code: officer.territoryCode,
      target_month: monthStr,
      sales_target: Number(salesTarget) || 0,
      orders_target: Number(ordersTarget) || 0,
      credits_target: Number(creditsTarget) || 0,
      payments_target: Number(paymentsTarget) || 0,
      notes: notes || null,
      created_by: user?.id,
    };

    let error;
    if (existingTarget?.id) {
      const res = await supabase.from("officer_targets").update(payload).eq("id", existingTarget.id);
      error = res.error;
    } else {
      const res = await supabase.from("officer_targets").upsert(payload, {
        onConflict: "user_id,territory_code,target_month",
      });
      error = res.error;
    }

    if (error) {
      toast.error("Failed to save target: " + error.message);
    } else {
      toast.success("Target saved successfully");
      queryClient.invalidateQueries({ queryKey: ["officer-targets"] });
      onOpenChange(false);
    }
    setSaving(false);
  };

  if (!officer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Set Target — {officer.name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {officer.territoryName} • {format(targetMonth, "MMMM yyyy")}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Sales Target (₹)</Label>
              <Input type="number" value={salesTarget} onChange={e => setSalesTarget(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label>Orders Target</Label>
              <Input type="number" value={ordersTarget} onChange={e => setOrdersTarget(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label>Credits Target (₹)</Label>
              <Input type="number" value={creditsTarget} onChange={e => setCreditsTarget(e.target.value)} placeholder="0" />
            </div>
            <div>
              <Label>Payments Target (₹)</Label>
              <Input type="number" value={paymentsTarget} onChange={e => setPaymentsTarget(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Target"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
