import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Bell, Lock, Database, Upload, BookOpen, FileCode, Clock, History, CalendarClock } from "lucide-react";
import { DataExportSection } from "@/components/settings/DataExportSection";
import { DataImportSection } from "@/components/settings/DataImportSection";
import { MigrationGuide } from "@/components/settings/MigrationGuide";
import { SQLExportSection } from "@/components/settings/SQLExportSection";
import { SQLImportSection } from "@/components/settings/SQLImportSection";
import { ScheduledBackupSection } from "@/components/settings/ScheduledBackupSection";
import { BackupHistorySection } from "@/components/settings/BackupHistorySection";
import { MonthlyExportSection } from "@/components/settings/MonthlyExportSection";

const Settings = () => {
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [phone, setPhone] = useState(profile?.phone || "");

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone })
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to update profile");
      return;
    }

    toast.success("Profile updated successfully");
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Manage your account and application preferences
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="security">
              <Lock className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="data">
              <Database className="h-4 w-4 mr-2" />
              Data Export
            </TabsTrigger>
            <TabsTrigger value="monthly-export">
              <CalendarClock className="h-4 w-4 mr-2" />
              Monthly Export
            </TabsTrigger>
            <TabsTrigger value="import">
              <Upload className="h-4 w-4 mr-2" />
              Data Import
            </TabsTrigger>
            <TabsTrigger value="sql-export">
              <FileCode className="h-4 w-4 mr-2" />
              SQL Export
            </TabsTrigger>
            <TabsTrigger value="sql-import">
              <FileCode className="h-4 w-4 mr-2" />
              SQL Import
            </TabsTrigger>
            <TabsTrigger value="backup">
              <Clock className="h-4 w-4 mr-2" />
              Backups
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
            <TabsTrigger value="migration">
              <BookOpen className="h-4 w-4 mr-2" />
              Migration Guide
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal details</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile?.email || ""}
                      disabled
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={profile?.full_name || "Enter your name"}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={profile?.phone || "Enter your phone"}
                    />
                  </div>

                  <Button type="submit">Save Changes</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Manage your password and authentication</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const { error } = await supabase.auth.resetPasswordForEmail(
                        profile?.email || ""
                      );
                      if (error) {
                        toast.error("Failed to send password reset email");
                      } else {
                        toast.success("Password reset email sent");
                      }
                    }}
                  >
                    Change Password
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Configure how you receive notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Notification settings coming soon
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data">
            <DataExportSection />
          </TabsContent>

          <TabsContent value="monthly-export">
            <MonthlyExportSection />
          </TabsContent>

          <TabsContent value="import">
            <DataImportSection />
          </TabsContent>

          <TabsContent value="sql-export">
            <SQLExportSection />
          </TabsContent>

          <TabsContent value="sql-import">
            <SQLImportSection />
          </TabsContent>

          <TabsContent value="backup">
            <ScheduledBackupSection />
          </TabsContent>

          <TabsContent value="history">
            <BackupHistorySection />
          </TabsContent>

          <TabsContent value="migration">
            <MigrationGuide />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
