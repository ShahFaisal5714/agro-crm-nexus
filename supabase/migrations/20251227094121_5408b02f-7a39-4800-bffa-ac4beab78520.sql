-- Create product categories table
CREATE TABLE public.product_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage categories"
ON public.product_categories
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "All authenticated users can view categories"
ON public.product_categories
FOR SELECT
USING (true);

-- Add category_id to products table
ALTER TABLE public.products ADD COLUMN category_id UUID REFERENCES public.product_categories(id);

-- Create index for performance
CREATE INDEX idx_products_category_id ON public.products(category_id);