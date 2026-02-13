
-- Create officer_targets table for setting sales goals per officer per territory
CREATE TABLE public.officer_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  territory_code TEXT NOT NULL,
  target_month DATE NOT NULL,
  sales_target NUMERIC NOT NULL DEFAULT 0,
  orders_target INTEGER NOT NULL DEFAULT 0,
  credits_target NUMERIC NOT NULL DEFAULT 0,
  payments_target NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, territory_code, target_month)
);

-- Enable RLS
ALTER TABLE public.officer_targets ENABLE ROW LEVEL SECURITY;

-- Admins can manage all targets
CREATE POLICY "Admins can manage all officer targets"
ON public.officer_targets
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Territory managers can view their own targets
CREATE POLICY "Users can view own targets"
ON public.officer_targets
FOR SELECT
USING (auth.uid() = user_id);

-- Territory managers can insert targets for their territory
CREATE POLICY "Territory managers can insert targets"
ON public.officer_targets
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'territory_sales_manager'::app_role));

-- Territory managers can update their own targets
CREATE POLICY "Territory managers can update own targets"
ON public.officer_targets
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR (has_role(auth.uid(), 'territory_sales_manager'::app_role) AND auth.uid() = user_id));

-- Trigger for updated_at
CREATE TRIGGER update_officer_targets_updated_at
BEFORE UPDATE ON public.officer_targets
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
