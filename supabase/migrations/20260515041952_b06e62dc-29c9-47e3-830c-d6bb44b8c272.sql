ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_custom boolean NOT NULL DEFAULT false;
UPDATE public.products SET is_custom = true WHERE sku LIKE 'CUSTOM-%' AND is_custom = false;
CREATE INDEX IF NOT EXISTS idx_products_is_custom ON public.products(is_custom);