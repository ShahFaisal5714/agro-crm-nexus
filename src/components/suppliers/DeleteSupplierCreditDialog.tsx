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
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useState } from "react";
import { Loader2 } from "lucide-react";

interface DeleteSupplierCreditDialogProps {
  creditId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DeleteSupplierCreditDialog = ({
  creditId,
  open,
  onOpenChange,
}: DeleteSupplierCreditDialogProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    if (!creditId) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("supplier_credits")
        .delete()
        .eq("id", creditId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["supplier-credits"] });
      toast.success("Credit deleted successfully");
      onOpenChange(false);
    } catch (error: any) {
      console.error("Failed to delete credit:", error);
      toast.error("Failed to delete credit. Please try again.");
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
            Are you sure you want to delete this credit? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
