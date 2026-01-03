-- Add source column to invoices table to track where the invoice was generated from
ALTER TABLE public.invoices 
ADD COLUMN source text DEFAULT 'manual';

-- Add a comment to explain the column
COMMENT ON COLUMN public.invoices.source IS 'Source module that generated this invoice: manual, dealers, sales, purchases, expenses';