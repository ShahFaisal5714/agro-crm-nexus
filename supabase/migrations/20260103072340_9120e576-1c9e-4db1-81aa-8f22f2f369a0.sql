-- Create invoice_payments table for tracking payments against invoices
CREATE TABLE public.invoice_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  reference_number TEXT,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

-- Policies for invoice payments
CREATE POLICY "Admins can manage all invoice payments"
ON public.invoice_payments
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Territory managers can insert invoice payments"
ON public.invoice_payments
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'territory_sales_manager'::app_role));

CREATE POLICY "Territory managers can view invoice payments"
ON public.invoice_payments
FOR SELECT
USING (invoice_id IN (SELECT id FROM invoices));

CREATE POLICY "Territory managers can update invoice payments"
ON public.invoice_payments
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'territory_sales_manager'::app_role));

CREATE POLICY "Territory managers can delete invoice payments"
ON public.invoice_payments
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'territory_sales_manager'::app_role));

-- Add paid_amount column to invoices for tracking
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS paid_amount NUMERIC NOT NULL DEFAULT 0;