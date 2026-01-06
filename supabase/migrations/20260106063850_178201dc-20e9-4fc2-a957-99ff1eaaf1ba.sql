-- Create cash_transactions table to track all cash movements
CREATE TABLE public.cash_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_type text NOT NULL, -- 'manual_add', 'dealer_credit', 'dealer_payment', 'supplier_payment', 'expense'
    amount numeric NOT NULL,
    reference_id text, -- Reference to the related entity (dealer_credit.id, dealer_payment.id, etc.)
    reference_type text, -- 'dealer_credit', 'dealer_payment', 'supplier_payment', 'expense', 'manual'
    description text,
    transaction_date date NOT NULL DEFAULT CURRENT_DATE,
    created_by uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage all cash transactions"
ON public.cash_transactions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Territory managers can view cash transactions"
ON public.cash_transactions
FOR SELECT
USING (has_role(auth.uid(), 'territory_sales_manager'::app_role));

CREATE POLICY "Territory managers can insert cash transactions"
ON public.cash_transactions
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'territory_sales_manager'::app_role));