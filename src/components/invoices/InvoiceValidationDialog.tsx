import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, AlertTriangle, XCircle, CheckCircle2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ValidationCheck {
  category: string;
  status: "pass" | "warning" | "error";
  message: string;
  severity: "low" | "medium" | "high";
}

interface ValidationResult {
  overall_status: "pass" | "warning" | "error";
  score: number;
  checks: ValidationCheck[];
  summary: string;
}

const categoryLabels: Record<string, string> = {
  amount_accuracy: "Amount Accuracy",
  missing_fields: "Missing Fields",
  duplicate_detection: "Duplicate Detection",
  anomaly_detection: "Anomaly Detection",
};

const statusConfig = {
  pass: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-500/10", badge: "default" as const },
  warning: { icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-500/10", badge: "secondary" as const },
  error: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", badge: "destructive" as const },
};

export const InvoiceValidationDialog = ({ invoiceId, invoiceNumber }: { invoiceId: string; invoiceNumber: string }) => {
  const [open, setOpen] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);

  const handleValidate = async () => {
    setIsValidating(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("validate-invoice", {
        body: { invoiceId },
      });

      if (error) throw error;
      setResult(data as ValidationResult);
    } catch (err: any) {
      console.error("Validation error:", err);
      toast.error("Failed to validate invoice");
    } finally {
      setIsValidating(false);
    }
  };

  const overallConfig = result ? statusConfig[result.overall_status] : null;
  const OverallIcon = overallConfig?.icon || ShieldCheck;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v && !result) handleValidate(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Sparkles className="h-4 w-4 mr-2" />
          AI Validate
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Invoice Validation — {invoiceNumber}
          </DialogTitle>
        </DialogHeader>

        {isValidating ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">AI is validating your invoice...</p>
          </div>
        ) : result ? (
          <div className="space-y-4">
            {/* Overall Score */}
            <div className={`flex items-center justify-between p-4 rounded-lg ${overallConfig?.bg}`}>
              <div className="flex items-center gap-3">
                <OverallIcon className={`h-8 w-8 ${overallConfig?.color}`} />
                <div>
                  <p className="font-semibold">Validation Score</p>
                  <p className="text-sm text-muted-foreground">{result.summary}</p>
                </div>
              </div>
              <div className={`text-3xl font-bold ${overallConfig?.color}`}>
                {result.score}/100
              </div>
            </div>

            {/* Individual Checks */}
            <div className="space-y-2">
              {result.checks.map((check, i) => {
                const config = statusConfig[check.status];
                const Icon = config.icon;
                return (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${config.bg}`}>
                    <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${config.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-sm">
                          {categoryLabels[check.category] || check.category}
                        </span>
                        <Badge variant={config.badge} className="text-xs">
                          {check.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{check.message}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button variant="outline" className="w-full" onClick={handleValidate}>
              Re-validate
            </Button>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Click to start validation
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
