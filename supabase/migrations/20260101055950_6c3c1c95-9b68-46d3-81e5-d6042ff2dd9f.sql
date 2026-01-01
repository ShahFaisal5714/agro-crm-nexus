-- Create audit_logs table for tracking admin actions
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  user_email text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details jsonb,
  ip_address text
);

-- Enable Row Level Security
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only service role can insert audit logs (via edge functions)
CREATE POLICY "Service role can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs(entity_type);