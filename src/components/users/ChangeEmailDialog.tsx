import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ChangeEmailDialogProps {
  userId: string;
  userName: string;
  currentEmail: string;
}

export const ChangeEmailDialog = ({
  userId,
  userName,
  currentEmail,
}: ChangeEmailDialogProps) => {
  const [open, setOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const queryClient = useQueryClient();

  const changeEmail = useMutation({
    mutationFn: async () => {
      if (newEmail !== confirmEmail) {
        throw new Error("Emails do not match");
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        throw new Error("Invalid email format");
      }

      const { data, error } = await supabase.functions.invoke("change-user-email", {
        body: { userId, newEmail },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Email changed successfully");
      setOpen(false);
      setNewEmail("");
      setConfirmEmail("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    changeEmail.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Mail className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Email for {userName}</DialogTitle>
          <DialogDescription>
            Current email: {currentEmail}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>New Email</Label>
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Enter new email"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Confirm New Email</Label>
            <Input
              type="email"
              value={confirmEmail}
              onChange={(e) => setConfirmEmail(e.target.value)}
              placeholder="Confirm new email"
              required
            />
            {confirmEmail && newEmail !== confirmEmail && (
              <p className="text-xs text-destructive">Emails do not match</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={changeEmail.isPending || newEmail !== confirmEmail || !newEmail}
            >
              {changeEmail.isPending ? "Changing..." : "Change Email"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
