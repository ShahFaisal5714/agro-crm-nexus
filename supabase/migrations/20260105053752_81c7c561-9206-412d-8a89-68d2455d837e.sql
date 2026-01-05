-- Add pack_size column to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS pack_size text;

-- Add INSERT policy for dealers (allow territory managers to add dealers)
CREATE POLICY "Territory managers can insert dealers"
ON public.dealers
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'territory_sales_manager'::app_role)
);

-- Add UPDATE policy for dealers (allow territory managers to update their dealers)
CREATE POLICY "Territory managers can update their territory dealers"
ON public.dealers
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  (has_role(auth.uid(), 'territory_sales_manager'::app_role) AND 
   territory_id IN (
     SELECT t.id FROM territories t
     JOIN user_roles ur ON ur.territory = t.code
     WHERE ur.user_id = auth.uid()
   ))
);

-- Add DELETE policy for dealers (allow territory managers to delete their dealers)
CREATE POLICY "Territory managers can delete their territory dealers"
ON public.dealers
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  (has_role(auth.uid(), 'territory_sales_manager'::app_role) AND 
   territory_id IN (
     SELECT t.id FROM territories t
     JOIN user_roles ur ON ur.territory = t.code
     WHERE ur.user_id = auth.uid()
   ))
);