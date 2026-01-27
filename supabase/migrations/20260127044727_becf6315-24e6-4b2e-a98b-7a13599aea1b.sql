-- Create backup_history table for audit purposes
CREATE TABLE public.backup_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type TEXT NOT NULL CHECK (backup_type IN ('scheduled', 'manual', 'incremental')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('running', 'completed', 'failed')),
  total_records INTEGER NOT NULL DEFAULT 0,
  table_counts JSONB NOT NULL DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  triggered_by UUID,
  notification_email TEXT,
  error_message TEXT,
  notes TEXT,
  is_incremental BOOLEAN NOT NULL DEFAULT false,
  incremental_since TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.backup_history ENABLE ROW LEVEL SECURITY;

-- Only admins can view backup history
CREATE POLICY "Admins can view backup history"
  ON public.backup_history
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow insert via service role (edge function) - no direct user insert
CREATE POLICY "No direct user inserts to backup history"
  ON public.backup_history
  FOR INSERT
  WITH CHECK (false);

-- Create index for efficient querying
CREATE INDEX idx_backup_history_started_at ON public.backup_history(started_at DESC);
CREATE INDEX idx_backup_history_backup_type ON public.backup_history(backup_type);