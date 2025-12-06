-- Add delete policies for purchases and purchase_items
CREATE POLICY "Admins can delete purchases" 
ON public.purchases 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete purchase items" 
ON public.purchase_items 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));