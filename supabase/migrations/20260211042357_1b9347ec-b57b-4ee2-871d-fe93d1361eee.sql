
-- Create regions table
CREATE TABLE public.regions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage regions" ON public.regions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "All authenticated users can view regions" ON public.regions FOR SELECT USING (true);

-- Add region_id to territories
ALTER TABLE public.territories ADD COLUMN region_id UUID REFERENCES public.regions(id) ON DELETE SET NULL;

-- Validation trigger for regions
CREATE OR REPLACE FUNCTION public.validate_region()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF length(NEW.name) > 100 THEN
    RAISE EXCEPTION 'Region name must be less than 100 characters';
  END IF;
  IF length(NEW.code) > 20 THEN
    RAISE EXCEPTION 'Region code must be less than 20 characters';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_region_trigger
BEFORE INSERT OR UPDATE ON public.regions
FOR EACH ROW EXECUTE FUNCTION public.validate_region();

-- Accountant SELECT policies
CREATE POLICY "Accountants can view dealers" ON public.dealers FOR SELECT USING (has_role(auth.uid(), 'accountant'::app_role));
CREATE POLICY "Accountants can view sales orders" ON public.sales_orders FOR SELECT USING (has_role(auth.uid(), 'accountant'::app_role));
CREATE POLICY "Accountants can view sales order items" ON public.sales_order_items FOR SELECT USING (has_role(auth.uid(), 'accountant'::app_role));
CREATE POLICY "Accountants can view invoices" ON public.invoices FOR SELECT USING (has_role(auth.uid(), 'accountant'::app_role));
CREATE POLICY "Accountants can view invoice items" ON public.invoice_items FOR SELECT USING (has_role(auth.uid(), 'accountant'::app_role));
CREATE POLICY "Accountants can view invoice payments" ON public.invoice_payments FOR SELECT USING (has_role(auth.uid(), 'accountant'::app_role));
CREATE POLICY "Accountants can view dealer credits" ON public.dealer_credits FOR SELECT USING (has_role(auth.uid(), 'accountant'::app_role));
CREATE POLICY "Accountants can view dealer payments" ON public.dealer_payments FOR SELECT USING (has_role(auth.uid(), 'accountant'::app_role));
CREATE POLICY "Accountants can view policies" ON public.policies FOR SELECT USING (has_role(auth.uid(), 'accountant'::app_role));
CREATE POLICY "Accountants can view policy items" ON public.policy_items FOR SELECT USING (has_role(auth.uid(), 'accountant'::app_role));
CREATE POLICY "Accountants can view policy payments" ON public.policy_payments FOR SELECT USING (has_role(auth.uid(), 'accountant'::app_role));
