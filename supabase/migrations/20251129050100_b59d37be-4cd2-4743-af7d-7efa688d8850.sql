-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  unit_price DECIMAL(10,2) NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'units',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sales_orders table
CREATE TABLE public.sales_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT status_check CHECK (status IN ('pending', 'confirmed', 'delivered', 'cancelled'))
);

-- Create sales_order_items table
CREATE TABLE public.sales_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sales_order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;

-- Products policies (all authenticated users can view, admin can manage)
CREATE POLICY "All authenticated users can view products"
ON public.products FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage products"
ON public.products FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Sales orders policies
CREATE POLICY "Admins can view all sales orders"
ON public.sales_orders FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Territory managers can view their territory sales orders"
ON public.sales_orders FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'territory_sales_manager'::app_role) 
  AND dealer_id IN (
    SELECT d.id FROM public.dealers d
    JOIN public.user_roles ur ON ur.territory = (SELECT code FROM territories WHERE id = d.territory_id)
    WHERE ur.user_id = auth.uid()
  )
);

CREATE POLICY "Dealers can view own sales orders"
ON public.sales_orders FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'dealer'::app_role)
  AND dealer_id IN (SELECT id FROM public.dealers WHERE user_id = auth.uid())
);

CREATE POLICY "Admins and territory managers can create sales orders"
ON public.sales_orders FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'territory_sales_manager'::app_role)
);

CREATE POLICY "Admins and territory managers can update sales orders"
ON public.sales_orders FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    has_role(auth.uid(), 'territory_sales_manager'::app_role)
    AND dealer_id IN (
      SELECT d.id FROM public.dealers d
      JOIN public.user_roles ur ON ur.territory = (SELECT code FROM territories WHERE id = d.territory_id)
      WHERE ur.user_id = auth.uid()
    )
  )
);

-- Sales order items policies (inherit from sales_orders)
CREATE POLICY "Users can view sales order items if they can view the order"
ON public.sales_order_items FOR SELECT
TO authenticated
USING (
  sales_order_id IN (SELECT id FROM public.sales_orders)
);

CREATE POLICY "Users can insert sales order items if they can create orders"
ON public.sales_order_items FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'territory_sales_manager'::app_role)
);

-- Triggers for updated_at
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_sales_orders_updated_at
BEFORE UPDATE ON public.sales_orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Function to generate order number
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
  order_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.sales_orders
  WHERE order_number ~ '^SO-[0-9]+$';
  
  order_num := 'SO-' || LPAD(next_num::TEXT, 6, '0');
  RETURN order_num;
END;
$$;