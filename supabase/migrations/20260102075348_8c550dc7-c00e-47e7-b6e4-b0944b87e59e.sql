-- Create dealer_credits table for tracking credit/loan to dealers
CREATE TABLE public.dealer_credits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  amount NUMERIC NOT NULL,
  credit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Create dealer_payments table for tracking weekly payments from dealers
CREATE TABLE public.dealer_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  reference_number TEXT,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dealer_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for dealer_credits
CREATE POLICY "Admins can manage all dealer credits" 
ON public.dealer_credits FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Territory managers can view their territory dealer credits" 
ON public.dealer_credits FOR SELECT 
USING (
  has_role(auth.uid(), 'territory_sales_manager'::app_role) AND 
  dealer_id IN (
    SELECT d.id FROM dealers d
    JOIN user_roles ur ON ur.territory = (SELECT territories.code FROM territories WHERE territories.id = d.territory_id)
    WHERE ur.user_id = auth.uid()
  )
);

CREATE POLICY "Territory managers can insert dealer credits" 
ON public.dealer_credits FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'territory_sales_manager'::app_role)
);

CREATE POLICY "Dealers can view own credits" 
ON public.dealer_credits FOR SELECT 
USING (
  has_role(auth.uid(), 'dealer'::app_role) AND 
  dealer_id IN (SELECT id FROM dealers WHERE user_id = auth.uid())
);

-- RLS policies for dealer_payments
CREATE POLICY "Admins can manage all dealer payments" 
ON public.dealer_payments FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Territory managers can view their territory dealer payments" 
ON public.dealer_payments FOR SELECT 
USING (
  has_role(auth.uid(), 'territory_sales_manager'::app_role) AND 
  dealer_id IN (
    SELECT d.id FROM dealers d
    JOIN user_roles ur ON ur.territory = (SELECT territories.code FROM territories WHERE territories.id = d.territory_id)
    WHERE ur.user_id = auth.uid()
  )
);

CREATE POLICY "Territory managers can insert dealer payments" 
ON public.dealer_payments FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'territory_sales_manager'::app_role)
);

CREATE POLICY "Dealers can view own payments" 
ON public.dealer_payments FOR SELECT 
USING (
  has_role(auth.uid(), 'dealer'::app_role) AND 
  dealer_id IN (SELECT id FROM dealers WHERE user_id = auth.uid())
);