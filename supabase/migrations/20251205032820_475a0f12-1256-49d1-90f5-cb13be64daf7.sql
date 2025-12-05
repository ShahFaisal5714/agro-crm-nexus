-- Create invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  sales_order_id UUID REFERENCES public.sales_orders(id) ON DELETE SET NULL,
  dealer_id UUID NOT NULL REFERENCES public.dealers(id),
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'overdue', 'cancelled')),
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invoice items table
CREATE TABLE public.invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  description TEXT,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  total NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Generate invoice number function
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
  invoice_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.invoices
  WHERE invoice_number ~ '^INV-[0-9]+$';
  
  invoice_num := 'INV-' || LPAD(next_num::TEXT, 6, '0');
  RETURN invoice_num;
END;
$$;

-- RLS policies for invoices
CREATE POLICY "Admins can manage all invoices"
ON public.invoices
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Territory managers can view their territory invoices"
ON public.invoices
FOR SELECT
USING (
  has_role(auth.uid(), 'territory_sales_manager'::app_role) AND
  dealer_id IN (
    SELECT d.id FROM dealers d
    JOIN user_roles ur ON ur.territory = (SELECT territories.code FROM territories WHERE territories.id = d.territory_id)
    WHERE ur.user_id = auth.uid()
  )
);

CREATE POLICY "Territory managers can create invoices"
ON public.invoices
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'territory_sales_manager'::app_role)
);

CREATE POLICY "Territory managers can update their territory invoices"
ON public.invoices
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  (has_role(auth.uid(), 'territory_sales_manager'::app_role) AND
   dealer_id IN (
     SELECT d.id FROM dealers d
     JOIN user_roles ur ON ur.territory = (SELECT territories.code FROM territories WHERE territories.id = d.territory_id)
     WHERE ur.user_id = auth.uid()
   ))
);

CREATE POLICY "Territory managers can delete their territory invoices"
ON public.invoices
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  (has_role(auth.uid(), 'territory_sales_manager'::app_role) AND
   dealer_id IN (
     SELECT d.id FROM dealers d
     JOIN user_roles ur ON ur.territory = (SELECT territories.code FROM territories WHERE territories.id = d.territory_id)
     WHERE ur.user_id = auth.uid()
   ))
);

CREATE POLICY "Dealers can view own invoices"
ON public.invoices
FOR SELECT
USING (
  has_role(auth.uid(), 'dealer'::app_role) AND
  dealer_id IN (SELECT dealers.id FROM dealers WHERE dealers.user_id = auth.uid())
);

-- RLS policies for invoice items
CREATE POLICY "Users can view invoice items if they can view the invoice"
ON public.invoice_items
FOR SELECT
USING (invoice_id IN (SELECT invoices.id FROM invoices));

CREATE POLICY "Users can insert invoice items if they can create invoices"
ON public.invoice_items
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'territory_sales_manager'::app_role)
);

CREATE POLICY "Users can delete invoice items"
ON public.invoice_items
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'territory_sales_manager'::app_role)
);

-- Add trigger for updated_at
CREATE TRIGGER update_invoices_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();