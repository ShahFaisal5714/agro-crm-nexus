import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil } from "lucide-react";
import { useTerritoryOfficers, TerritoryOfficer } from "@/hooks/useTerritoryOfficers";

interface Territory {
  id: string;
  name: string;
  code: string;
}

export const EditOfficerDialog = ({ officer, territories, assignedTerritoryIds }: { officer: TerritoryOfficer; territories: Territory[]; assignedTerritoryIds: string[] }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(officer.officer_name);
  const [phone, setPhone] = useState(officer.phone || "");
  const [territoryId, setTerritoryId] = useState(officer.territory_id || "");
  const { updateOfficer, isUpdating } = useTerritoryOfficers();

  const availableTerritories = territories.filter(t => t.id === officer.territory_id || !assignedTerritoryIds.includes(t.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateOfficer({
      id: officer.id,
      officer_name: name,
      phone: phone || null,
      territory_id: territoryId || null,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (v) { setName(officer.officer_name); setPhone(officer.phone || ""); setTerritoryId(officer.territory_id || ""); }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><Pencil className="h-4 w-4" /></Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Territory Sales Officer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Officer Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Territory</Label>
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
          <Button type="submit" className="w-full" disabled={isUpdating}>
            {isUpdating ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
