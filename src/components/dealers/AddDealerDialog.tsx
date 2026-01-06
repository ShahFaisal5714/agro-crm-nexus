import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Territory {
  id: string;
  name: string;
  code: string;
}

export const AddDealerDialog = ({ territories }: { territories: Territory[] }) => {
  const [open, setOpen] = useState(false);
  const [dealerName, setDealerName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [territoryId, setTerritoryId] = useState("");
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from("dealers").insert({
      dealer_name: dealerName,
      contact_person: contactPerson,
      email: email || null,
      phone: phone || null,
      address: address || null,
      gst_number: gstNumber || null,
      territory_id: territoryId || null,
    });

    if (error) {
      console.error("Error adding dealer:", error);
      if (error.code === "42501" || error.message?.includes("policy")) {
        toast.error("You don't have permission to add dealers. Admin or Territory Manager role required.");
      } else {
        toast.error(`Failed to add dealer: ${error.message}`);
      }
      return;
    }

    toast.success("Dealer added successfully");
    queryClient.invalidateQueries({ queryKey: ["dealers"] });
    setOpen(false);
    setDealerName("");
    setContactPerson("");
    setEmail("");
    setPhone("");
    setAddress("");
    setGstNumber("");
    setTerritoryId("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Dealer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Dealer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dealerName">Dealer Name *</Label>
            <Input
              id="dealerName"
              value={dealerName}
              onChange={(e) => setDealerName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="territory">Territory</Label>
            <Select value={territoryId} onValueChange={setTerritoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select territory" />
              </SelectTrigger>
              <SelectContent>
                {territories.map((territory) => (
                  <SelectItem key={territory.id} value={territory.id}>
                    {territory.name} ({territory.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactPerson">Contact Person</Label>
            <Input
              id="contactPerson"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="gstNumber">GST Number</Label>
            <Input
              id="gstNumber"
              value={gstNumber}
              onChange={(e) => setGstNumber(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full">
            Add Dealer
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
