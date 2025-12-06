-- Drop existing restrictive policies for purchases
DROP POLICY IF EXISTS "Admins can create purchases" ON public.purchases;
DROP POLICY IF EXISTS "Admins can view all purchases" ON public.purchases;
DROP POLICY IF EXISTS "Admins can update purchases" ON public.purchases;

-- Drop existing restrictive policies for purchase_items
DROP POLICY IF EXISTS "Admins can insert purchase items" ON public.purchase_items;

-- Create new policies that allow territory managers as well for purchases
CREATE POLICY "Admins and territory managers can create purchases" 
ON public.purchases 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'territory_sales_manager'::app_role));

CREATE POLICY "Admins can view all purchases" 
ON public.purchases 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Territory managers can view their purchases" 
ON public.purchases 
FOR SELECT 
USING (has_role(auth.uid(), 'territory_sales_manager'::app_role) AND created_by = auth.uid());

CREATE POLICY "Admins and territory managers can update purchases" 
ON public.purchases 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role) OR (has_role(auth.uid(), 'territory_sales_manager'::app_role) AND created_by = auth.uid()));

-- Create new policies for purchase_items
CREATE POLICY "Admins and territory managers can insert purchase items" 
ON public.purchase_items 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'territory_sales_manager'::app_role));