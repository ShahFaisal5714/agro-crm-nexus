import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Dealer } from "@/hooks/useDealers";

interface Territory {
  id: string;
  name: string;
  code: string;
}

interface EditDealerDialogProps {
  dealer: Dealer;
  territories: Territory[];
}

export const EditDealerDialog = ({ dealer, territories }: EditDealerDialogProps) => {
  const [open, setOpen] = useState(false);
  const [dealerName, setDealerName] = useState(dealer.dealer_name);
  const [contactPerson, setContactPerson] = useState(dealer.contact_person || "");
  const [email, setEmail] = useState(dealer.email || "");
  const [phone, setPhone] = useState(dealer.phone || "");
  const [address, setAddress] = useState(dealer.address || "");
  const [gstNumber, setGstNumber] = useState(dealer.gst_number || "");
  const [territoryId, setTerritoryId] = useState(dealer.territory_id || "");
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase
      .from("dealers")
      .update({
        dealer_name: dealerName,
        contact_person: contactPerson,
        email,
        phone,
        address,
        gst_number: gstNumber,
        territory_id: territoryId || null,
      })
      .eq("id", dealer.id);

    if (error) {
      toast.error("Failed to update dealer");
      console.error(error);
      return;
    }

    toast.success("Dealer updated successfully");
    queryClient.invalidateQueries({ queryKey: ["dealers"] });
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
          <DialogTitle>Edit Dealer</DialogTitle>
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
            <Select value={territoryId || "none"} onValueChange={(v) => setTerritoryId(v === "none" ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select territory" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-- No Territory --</SelectItem>
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
            Update Dealer
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
