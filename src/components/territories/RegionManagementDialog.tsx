import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, MapPin } from "lucide-react";
import { useRegions } from "@/hooks/useRegions";
import { toast } from "sonner";

export const RegionManagementDialog = () => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const { regions, isLoading, createRegion, updateRegion, deleteRegion, isCreating } = useRegions();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingId) {
      await updateRegion({ id: editingId, name, code: code.toUpperCase(), description: description || undefined });
      setEditingId(null);
    } else {
      await createRegion({ name, code: code.toUpperCase(), description: description || undefined });
    }
    
    setName("");
    setCode("");
    setDescription("");
  };

  const handleEdit = (region: { id: string; name: string; code: string; description?: string }) => {
    setEditingId(region.id);
    setName(region.name);
    setCode(region.code);
    setDescription(region.description || "");
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this region?")) {
      await deleteRegion(id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <MapPin className="h-4 w-4" />
          Manage Regions
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Region Management</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 border-b pb-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Region Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., North India" required />
            </div>
            <div className="space-y-1">
              <Label>Region Code *</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g., NORTH" required />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description" rows={2} />
          </div>
          <Button type="submit" size="sm" disabled={isCreating}>
            {editingId ? "Update Region" : "Add Region"}
          </Button>
          {editingId && (
            <Button type="button" variant="ghost" size="sm" onClick={() => { setEditingId(null); setName(""); setCode(""); setDescription(""); }}>
              Cancel
            </Button>
          )}
        </form>

        {regions.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regions.map((region) => (
                <TableRow key={region.id}>
                  <TableCell className="font-medium">{region.name}</TableCell>
                  <TableCell className="font-mono">{region.code}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{region.description || "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(region)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(region.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">No regions created yet</p>
        )}
      </DialogContent>
    </Dialog>
  );
};
