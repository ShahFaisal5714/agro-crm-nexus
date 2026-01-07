-- Create a secure function for inserting audit logs that bypasses RLS
CREATE OR REPLACE FUNCTION public.insert_audit_log(
  p_user_id UUID,
  p_user_email TEXT,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (user_id, user_email, action, entity_type, entity_id, details, ip_address)
  VALUES (p_user_id, p_user_email, p_action, p_entity_type, p_entity_id, p_details, p_ip_address)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.audit_logs;

-- Create a restrictive INSERT policy that denies direct inserts
-- All inserts must go through the insert_audit_log function
CREATE POLICY "No direct inserts to audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (false);