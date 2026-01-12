-- Add cost_price column to products table for proper COGS calculation
ALTER TABLE public.products 
ADD COLUMN cost_price numeric DEFAULT 0;

-- Update existing products to set cost_price to 80% of unit_price as a starting point
-- This can be adjusted by the user later
UPDATE public.products 
SET cost_price = unit_price * 0.8 
WHERE cost_price IS NULL OR cost_price = 0;