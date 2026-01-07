import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Edit } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Territory {
  id: string;
  name: string;
  code: string;
}

interface EditUserRoleDialogProps {
  userId: string;
  userName: string;
  currentRole: string;
  currentTerritory?: string;
  territories: Territory[];
}

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "territory_sales_manager", label: "Territory Sales Manager" },
  { value: "dealer", label: "Dealer" },
  { value: "finance", label: "Finance" },
  { value: "employee", label: "Employee" },
];

export const EditUserRoleDialog = ({
  userId,
  userName,
  currentRole,
  currentTerritory,
  territories,
}: EditUserRoleDialogProps) => {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState(currentRole);
  const [territory, setTerritory] = useState(currentTerritory || "");
  const queryClient = useQueryClient();

  const updateRole = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("update-user-role", {
        body: {
          userId,
          role: role as any,
          territory: role === "territory_sales_manager" ? territory : null,
        },
      });

      if (error) throw new Error(error.message || "Failed to update role");
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-roles"] });
      toast.success("Role updated successfully");
      setOpen(false);
    },
    onError: (error: Error) => {
      console.error("Failed to update role:", error);
      toast.error("Failed to update role. Please try again.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateRole.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Role for {userName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {role === "territory_sales_manager" && (
            <div className="space-y-2">
              <Label>Territory</Label>
              <Select value={territory} onValueChange={setTerritory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select territory" />
                </SelectTrigger>
                <SelectContent>
                  {territories.map((t) => (
                    <SelectItem key={t.id} value={t.code}>
                      {t.name} ({t.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateRole.isPending}>
              {updateRole.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
