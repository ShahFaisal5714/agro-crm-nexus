import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface DeleteTerritoryDialogProps {
  territoryId: string;
  territoryName: string;
  dealerCount: number;
}

export const DeleteTerritoryDialog = ({ territoryId, territoryName, dealerCount }: DeleteTerritoryDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    if (dealerCount > 0) {
      toast.error("Cannot delete territory with assigned dealers");
      setOpen(false);
      return;
    }

    setIsDeleting(true);

    const { error } = await supabase.from("territories").delete().eq("id", territoryId);

    if (error) {
      toast.error("Failed to delete territory");
      console.error(error);
      setIsDeleting(false);
      return;
    }

    toast.success("Territory deleted successfully");
    queryClient.invalidateQueries({ queryKey: ["territories"] });
    queryClient.invalidateQueries({ queryKey: ["dealers"] });
    setOpen(false);
    setIsDeleting(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Territory</AlertDialogTitle>
          <AlertDialogDescription>
            {dealerCount > 0 ? (
              <>
                Cannot delete "{territoryName}" because it has {dealerCount} dealer(s) assigned. 
                Please reassign or remove the dealers first.
              </>
            ) : (
              <>
                Are you sure you want to delete "{territoryName}"? This action cannot be undone.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {dealerCount === 0 && (
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
