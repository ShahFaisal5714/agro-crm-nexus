-- Add start_date and end_date to policies
ALTER TABLE public.policies 
ADD COLUMN start_date date,
ADD COLUMN end_date date;

-- Create policy_items table for multiple products per policy
CREATE TABLE public.policy_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_id uuid NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity integer NOT NULL,
  rate_per_unit numeric NOT NULL,
  total numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on policy_items
ALTER TABLE public.policy_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for policy_items
CREATE POLICY "Users can view policy items if they can view the policy"
ON public.policy_items FOR SELECT
USING (policy_id IN (SELECT id FROM policies));

CREATE POLICY "Users can insert policy items"
ON public.policy_items FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'territory_sales_manager'::app_role));

CREATE POLICY "Users can delete policy items"
ON public.policy_items FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'territory_sales_manager'::app_role));

CREATE POLICY "Users can update policy items"
ON public.policy_items FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'territory_sales_manager'::app_role));