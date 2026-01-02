-- Add UPDATE and DELETE policies for supplier_credits
CREATE POLICY "Admins and territory managers can update supplier credits"
ON public.supplier_credits
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'territory_sales_manager'::app_role));

CREATE POLICY "Admins and territory managers can delete supplier credits"
ON public.supplier_credits
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'territory_sales_manager'::app_role));

-- Add UPDATE and DELETE policies for supplier_payments
CREATE POLICY "Admins and territory managers can update supplier payments"
ON public.supplier_payments
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'territory_sales_manager'::app_role));

CREATE POLICY "Admins and territory managers can delete supplier payments"
ON public.supplier_payments
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'territory_sales_manager'::app_role));