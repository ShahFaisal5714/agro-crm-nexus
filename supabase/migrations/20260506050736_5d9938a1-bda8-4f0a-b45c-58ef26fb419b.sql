-- Expenses: add region_id and assigned person fields
ALTER TABLE public.expenses 
  ADD COLUMN IF NOT EXISTS region_id uuid REFERENCES public.regions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS territory_id uuid REFERENCES public.territories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_to_name text,
  ADD COLUMN IF NOT EXISTS notes text;

-- Make supplier_credits.product_id explicitly optional (already nullable) and ensure quantity-related fields are not required
-- Add quantity column as optional just in case it's used elsewhere
ALTER TABLE public.supplier_credits
  ADD COLUMN IF NOT EXISTS quantity numeric;

-- Add notes columns to transactions if missing (they exist; just ensure)
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS extra_notes text;
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS extra_notes text;
ALTER TABLE public.dealer_credits ADD COLUMN IF NOT EXISTS extra_notes text;
ALTER TABLE public.dealer_payments ADD COLUMN IF NOT EXISTS extra_notes text;