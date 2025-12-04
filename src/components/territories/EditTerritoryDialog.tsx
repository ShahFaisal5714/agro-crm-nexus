import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Territory {
  id: string;
  name: string;
  code: string;
}

interface EditTerritoryDialogProps {
  territory: Territory;
}

export const EditTerritoryDialog = ({ territory }: EditTerritoryDialogProps) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(territory.name);
  const [code, setCode] = useState(territory.code);
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase
      .from("territories")
      .update({
        name,
        code: code.toUpperCase(),
      })
      .eq("id", territory.id);

    if (error) {
      toast.error("Failed to update territory");
      console.error(error);
      return;
    }

    toast.success("Territory updated successfully");
    queryClient.invalidateQueries({ queryKey: ["territories"] });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Territory</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Territory Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">Territory Code *</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full">
            Update Territory
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
