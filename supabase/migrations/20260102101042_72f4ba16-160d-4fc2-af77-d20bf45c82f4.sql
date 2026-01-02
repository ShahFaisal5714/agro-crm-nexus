-- Create supplier_credits table to track credit given by suppliers
CREATE TABLE public.supplier_credits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id),
  amount numeric NOT NULL,
  credit_date date NOT NULL DEFAULT CURRENT_DATE,
  description text,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create supplier_payments table to track payments made to suppliers
CREATE TABLE public.supplier_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text NOT NULL DEFAULT 'cash',
  reference_number text,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.supplier_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for supplier_credits
CREATE POLICY "Admins can manage all supplier credits"
ON public.supplier_credits FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Territory managers can insert supplier credits"
ON public.supplier_credits FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'territory_sales_manager'::app_role));

CREATE POLICY "Territory managers can view supplier credits"
ON public.supplier_credits FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'territory_sales_manager'::app_role));

-- RLS policies for supplier_payments
CREATE POLICY "Admins can manage all supplier payments"
ON public.supplier_payments FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Territory managers can insert supplier payments"
ON public.supplier_payments FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'territory_sales_manager'::app_role));

CREATE POLICY "Territory managers can view supplier payments"
ON public.supplier_payments FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'territory_sales_manager'::app_role));