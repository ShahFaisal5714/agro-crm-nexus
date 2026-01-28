import { useState, useEffect } from "react";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/lib/auth";

interface DeleteUserDialogProps {
  userId: string;
  userName: string;
}

export const DeleteUserDialog = ({ userId, userName }: DeleteUserDialogProps) => {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [affectedRecords, setAffectedRecords] = useState<Record<string, number>>({});
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isSelfDelete = !!user?.id && user.id === userId;

  useEffect(() => {
    if (open) {
      // No need to fetch affected records if deleting self is blocked.
      if (!isSelfDelete) fetchAffectedRecords();
    }
  }, [open, isSelfDelete]);

  const fetchAffectedRecords = async () => {
    setIsLoadingRecords(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-user-records", {
        body: { userId },
      });

      if (error) {
        console.error("Error fetching records:", error);
        return;
      }

      if (data?.records) {
        setAffectedRecords(data.records);
      }
    } catch (error) {
      console.error("Error fetching affected records:", error);
    } finally {
      setIsLoadingRecords(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { userId },
      });

      if (error) {
        throw new Error(error.message || "Failed to delete user");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Success",
        description: `User "${userName}" has been deleted`,
      });

      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["user-roles"] });
      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const totalRecords = Object.values(affectedRecords).reduce((sum, count) => sum + count, 0);
  const hasAffectedRecords = totalRecords > 0;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete User
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                Are you sure you want to delete <strong>{userName}</strong>? This action cannot be undone.
              </p>

              {isSelfDelete && (
                <p className="text-sm text-muted-foreground">
                  You can’t delete your own account. Please sign in with a different admin user to delete this admin.
                </p>
              )}

              {isSelfDelete ? null : isLoadingRecords ? (
                <div className="flex items-center gap-2 py-4 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Checking affected records...</span>
                </div>
              ) : hasAffectedRecords ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3">
                  <p className="mb-2 text-sm font-medium text-destructive">
                    The following {totalRecords} record(s) will have their creator set to "Unknown":
                  </p>
                  <ScrollArea className="max-h-32">
                    <ul className="space-y-1 text-sm text-foreground/80">
                      {Object.entries(affectedRecords).map(([label, count]) => (
                        <li key={label} className="flex justify-between">
                          <span>{label}</span>
                          <span className="font-medium">{count}</span>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No records will be affected by this deletion.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting || isLoadingRecords || isSelfDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
