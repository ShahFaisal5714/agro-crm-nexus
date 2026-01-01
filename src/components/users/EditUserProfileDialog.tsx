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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Edit, Eye, EyeOff } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PasswordStrengthMeter } from "@/components/auth/PasswordStrengthMeter";

interface Territory {
  id: string;
  name: string;
  code: string;
}

interface EditUserProfileDialogProps {
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
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

export const EditUserProfileDialog = ({
  userId,
  userName,
  userEmail,
  userPhone,
  currentRole,
  currentTerritory,
  territories,
}: EditUserProfileDialogProps) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  
  // Profile state
  const [fullName, setFullName] = useState(userName);
  const [phone, setPhone] = useState(userPhone || "");
  
  // Role state
  const [role, setRole] = useState(currentRole);
  const [territory, setTerritory] = useState(currentTerritory || "");
  
  // Password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  
  const queryClient = useQueryClient();

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName, phone: phone || null })
        .eq("id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Profile updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateRole = useMutation({
    mutationFn: async () => {
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingRole) {
        const { error } = await supabase
          .from("user_roles")
          .update({
            role: role as any,
            territory: role === "territory_sales_manager" ? territory : null,
          })
          .eq("user_id", userId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_roles").insert({
          user_id: userId,
          role: role as any,
          territory: role === "territory_sales_manager" ? territory : null,
        });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-roles"] });
      toast.success("Role updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetPassword = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) {
        throw new Error("Passwords do not match");
      }
      if (passwordStrength < 3) {
        throw new Error("Password is too weak");
      }

      const { error } = await supabase.functions.invoke("reset-user-password", {
        body: { userId, newPassword },
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Password reset successfully");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate();
  };

  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    updateRole.mutate();
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    resetPassword.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User: {userName}</DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="role">Role</TabsTrigger>
            <TabsTrigger value="password">Password</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="space-y-4">
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={userEmail} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">
                  Email changes require verification flow
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter phone number"
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateProfile.isPending}>
                  {updateProfile.isPending ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </form>
          </TabsContent>
          
          <TabsContent value="role" className="space-y-4">
            <form onSubmit={handleSaveRole} className="space-y-4">
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
                  {updateRole.isPending ? "Saving..." : "Save Role"}
                </Button>
              </div>
            </form>
          </TabsContent>
          
          <TabsContent value="password" className="space-y-4">
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <PasswordStrengthMeter
                  password={newPassword}
                  onStrengthChange={setPasswordStrength}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Confirm Password</Label>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-destructive">Passwords do not match</p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={resetPassword.isPending || passwordStrength < 3 || newPassword !== confirmPassword}
                >
                  {resetPassword.isPending ? "Resetting..." : "Reset Password"}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
