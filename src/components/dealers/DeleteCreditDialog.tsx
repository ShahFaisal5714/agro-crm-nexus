import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { DealerCredit } from "@/hooks/useDealerCredits";

interface DeleteCreditDialogProps {
  credit: DealerCredit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DeleteCreditDialog = ({ credit, open, onOpenChange }: DeleteCreditDialogProps) => {
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from("dealer_credits")
        .delete()
        .eq("id", credit.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["dealer-credits"] });
      toast.success("Credit deleted successfully");
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting credit:", error);
      toast.error("Failed to delete credit");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Credit</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this credit of {formatCurrency(credit.amount)}? 
            This action cannot be undone and will affect the dealer's balance.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              "Delete"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
