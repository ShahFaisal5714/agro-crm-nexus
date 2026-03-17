-- Sales Returns table
CREATE TABLE public.sales_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id uuid REFERENCES public.sales_orders(id) ON DELETE SET NULL,
  dealer_id uuid NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  return_date date NOT NULL DEFAULT CURRENT_DATE,
  return_number text NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  reason text,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.sales_return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_return_id uuid NOT NULL REFERENCES public.sales_returns(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  total numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Purchase Returns table
CREATE TABLE public.purchase_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid REFERENCES public.purchases(id) ON DELETE SET NULL,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  return_date date NOT NULL DEFAULT CURRENT_DATE,
  return_number text NOT NULL,
  total_amount numeric NOT NULL DEFAULT 0,
  reason text,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.purchase_return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_return_id uuid NOT NULL REFERENCES public.purchase_returns(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity integer NOT NULL,
  unit_price numeric NOT NULL,
  total numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Generate return numbers
CREATE OR REPLACE FUNCTION public.generate_sales_return_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(return_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.sales_returns
  WHERE return_number ~ '^SR-[0-9]+$';
  RETURN 'SR-' || LPAD(next_num::TEXT, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_purchase_return_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(return_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.purchase_returns
  WHERE return_number ~ '^PR-[0-9]+$';
  RETURN 'PR-' || LPAD(next_num::TEXT, 6, '0');
END;
$$;

-- Enable RLS
ALTER TABLE public.sales_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_return_items ENABLE ROW LEVEL SECURITY;

-- RLS for sales_returns
CREATE POLICY "Admins can manage all sales returns" ON public.sales_returns FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Territory managers can manage sales returns" ON public.sales_returns FOR ALL TO public USING (has_role(auth.uid(), 'territory_sales_manager'::app_role));
CREATE POLICY "Accountants can manage sales returns" ON public.sales_returns FOR ALL TO public USING (has_role(auth.uid(), 'accountant'::app_role));

-- RLS for sales_return_items
CREATE POLICY "Users can manage sales return items" ON public.sales_return_items FOR ALL TO public USING (sales_return_id IN (SELECT id FROM public.sales_returns));

-- RLS for purchase_returns
CREATE POLICY "Admins can manage all purchase returns" ON public.purchase_returns FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Territory managers can manage purchase returns" ON public.purchase_returns FOR ALL TO public USING (has_role(auth.uid(), 'territory_sales_manager'::app_role));
CREATE POLICY "Accountants can manage purchase returns" ON public.purchase_returns FOR ALL TO public USING (has_role(auth.uid(), 'accountant'::app_role));

-- RLS for purchase_return_items
CREATE POLICY "Users can manage purchase return items" ON public.purchase_return_items FOR ALL TO public USING (purchase_return_id IN (SELECT id FROM public.purchase_returns));

-- RLS for purchase_return_items INSERT
CREATE POLICY "Users can insert purchase return items" ON public.purchase_return_items FOR INSERT TO public WITH CHECK (purchase_return_id IN (SELECT id FROM public.purchase_returns));

-- RLS for sales_return_items INSERT
CREATE POLICY "Users can insert sales return items" ON public.sales_return_items FOR INSERT TO public WITH CHECK (sales_return_id IN (SELECT id FROM public.sales_returns));