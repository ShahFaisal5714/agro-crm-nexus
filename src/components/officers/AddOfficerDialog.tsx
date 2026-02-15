import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useTerritoryOfficers } from "@/hooks/useTerritoryOfficers";

interface Territory {
  id: string;
  name: string;
  code: string;
}

export const AddOfficerDialog = ({ territories, assignedTerritoryIds }: { territories: Territory[]; assignedTerritoryIds: string[] }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [territoryId, setTerritoryId] = useState("");
  const { addOfficer, isAdding } = useTerritoryOfficers();

  const availableTerritories = territories.filter(t => !assignedTerritoryIds.includes(t.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addOfficer({
      officer_name: name,
      phone: phone || undefined,
      territory_id: territoryId || undefined,
    });
    setOpen(false);
    setName("");
    setPhone("");
    setTerritoryId("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Sales Officer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Territory Sales Officer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="officerName">Officer Name *</Label>
            <Input id="officerName" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="officerPhone">Phone</Label>
            <Input id="officerPhone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="officerTerritory">Territory</Label>
            <Select value={territoryId} onValueChange={setTerritoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select territory" />
              </SelectTrigger>
              <SelectContent>
                {availableTerritories.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name} ({t.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={isAdding}>
            {isAdding ? "Adding..." : "Add Sales Officer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
