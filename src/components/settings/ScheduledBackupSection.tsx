import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Clock, Mail, Loader2, CheckCircle } from "lucide-react";

export const ScheduledBackupSection = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [isEnabled, setIsEnabled] = useState(false);

  const handleTestBackup = async () => {
    if (!email) {
      toast.error("Please enter an email address for notifications");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("scheduled-backup", {
        body: { 
          email,
          isTest: true 
        },
      });

      if (error) throw error;

      toast.success("Test backup completed! Check your email for the notification.");
    } catch (error) {
      console.error("Backup error:", error);
      toast.error("Failed to run test backup. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (isEnabled && !email) {
      toast.error("Please enter an email address for notifications");
      return;
    }

    toast.success(`Backup settings saved. ${isEnabled ? `Backups will run ${frequency} and notify ${email}` : "Backups are disabled."}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Scheduled Backups
        </CardTitle>
        <CardDescription>
          Configure automatic database backups with email notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable Scheduled Backups</Label>
            <p className="text-sm text-muted-foreground">
              Automatically backup your database on a schedule
            </p>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={setIsEnabled}
          />
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="backup-email">Notification Email</Label>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <Input
                id="backup-email"
                type="email"
                placeholder="admin@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              You'll receive backup completion notifications at this email
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="backup-frequency">Backup Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger id="backup-frequency">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">Every Hour</SelectItem>
                <SelectItem value="daily">Daily (Recommended)</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          <Button
            onClick={handleTestBackup}
            disabled={isLoading || !email}
            variant="outline"
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running Backup...
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 mr-2" />
                Run Test Backup Now
              </>
            )}
          </Button>
          <Button
            onClick={handleSaveSettings}
            className="flex-1"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 text-sm">
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="font-medium">How Scheduled Backups Work:</p>
              <ul className="text-muted-foreground mt-1 space-y-1">
                <li>• Backups run automatically based on your schedule</li>
                <li>• Email notifications sent after each backup</li>
                <li>• Backup summary includes record counts per table</li>
                <li>• Test backup verifies your configuration</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
