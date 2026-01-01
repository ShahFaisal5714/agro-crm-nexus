-- Create policies table for advance payment collection before bringing products
CREATE TABLE public.policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_number TEXT NOT NULL UNIQUE,
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  rate_per_unit NUMERIC NOT NULL CHECK (rate_per_unit > 0),
  total_amount NUMERIC NOT NULL CHECK (total_amount >= 0),
  advance_amount NUMERIC NOT NULL DEFAULT 0 CHECK (advance_amount >= 0),
  remaining_amount NUMERIC GENERATED ALWAYS AS (total_amount - advance_amount) STORED,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'invoiced', 'cancelled')),
  expected_delivery_date DATE,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create policy payments table for tracking advance payments
CREATE TABLE public.policy_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer', 'cheque', 'upi')),
  reference_number TEXT,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_payments ENABLE ROW LEVEL SECURITY;

-- RLS policies for policies table
CREATE POLICY "Admins can manage all policies" ON public.policies
FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Territory managers can view their territory policies" ON public.policies
FOR SELECT USING (
  has_role(auth.uid(), 'territory_sales_manager') AND 
  dealer_id IN (
    SELECT d.id FROM dealers d
    JOIN user_roles ur ON ur.territory = (SELECT territories.code FROM territories WHERE territories.id = d.territory_id)
    WHERE ur.user_id = auth.uid()
  )
);

CREATE POLICY "Territory managers can create policies" ON public.policies
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'territory_sales_manager')
);

CREATE POLICY "Territory managers can update their territory policies" ON public.policies
FOR UPDATE USING (
  has_role(auth.uid(), 'admin') OR (
    has_role(auth.uid(), 'territory_sales_manager') AND 
    dealer_id IN (
      SELECT d.id FROM dealers d
      JOIN user_roles ur ON ur.territory = (SELECT territories.code FROM territories WHERE territories.id = d.territory_id)
      WHERE ur.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Territory managers can delete their territory policies" ON public.policies
FOR DELETE USING (
  has_role(auth.uid(), 'admin') OR (
    has_role(auth.uid(), 'territory_sales_manager') AND 
    dealer_id IN (
      SELECT d.id FROM dealers d
      JOIN user_roles ur ON ur.territory = (SELECT territories.code FROM territories WHERE territories.id = d.territory_id)
      WHERE ur.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Dealers can view their own policies" ON public.policies
FOR SELECT USING (
  has_role(auth.uid(), 'dealer') AND 
  dealer_id IN (SELECT id FROM dealers WHERE user_id = auth.uid())
);

-- RLS policies for policy_payments table
CREATE POLICY "Admins can manage all policy payments" ON public.policy_payments
FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view policy payments if they can view the policy" ON public.policy_payments
FOR SELECT USING (
  policy_id IN (SELECT id FROM policies)
);

CREATE POLICY "Users can insert policy payments" ON public.policy_payments
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'territory_sales_manager')
);

-- Function to generate policy number
CREATE OR REPLACE FUNCTION public.generate_policy_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
  policy_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(policy_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.policies
  WHERE policy_number ~ '^POL-[0-9]+$';
  
  policy_num := 'POL-' || LPAD(next_num::TEXT, 6, '0');
  RETURN policy_num;
END;
$$;

-- Trigger to update updated_at
CREATE TRIGGER update_policies_updated_at
  BEFORE UPDATE ON public.policies
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Trigger to update policy status based on payments
CREATE OR REPLACE FUNCTION public.update_policy_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  policy_total NUMERIC;
  total_paid NUMERIC;
BEGIN
  -- Get the policy total
  SELECT total_amount INTO policy_total FROM policies WHERE id = NEW.policy_id;
  
  -- Calculate total payments
  SELECT COALESCE(SUM(amount), 0) INTO total_paid 
  FROM policy_payments WHERE policy_id = NEW.policy_id;
  
  -- Update the policy advance amount and status
  UPDATE policies 
  SET 
    advance_amount = total_paid,
    status = CASE 
      WHEN total_paid >= policy_total THEN 'paid'
      WHEN total_paid > 0 THEN 'partial'
      ELSE 'pending'
    END
  WHERE id = NEW.policy_id;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_policy_on_payment
  AFTER INSERT ON public.policy_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_policy_status();