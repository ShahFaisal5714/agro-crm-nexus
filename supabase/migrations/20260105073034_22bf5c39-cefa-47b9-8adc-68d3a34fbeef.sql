-- Add UPDATE policy for dealer credits
CREATE POLICY "Admins and territory managers can update dealer credits"
ON public.dealer_credits
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'territory_sales_manager'::app_role)
);

-- Add DELETE policy for dealer credits
CREATE POLICY "Admins and territory managers can delete dealer credits"
ON public.dealer_credits
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'territory_sales_manager'::app_role)
);

-- Add UPDATE policy for dealer payments
CREATE POLICY "Admins and territory managers can update dealer payments"
ON public.dealer_payments
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'territory_sales_manager'::app_role)
);

-- Add DELETE policy for dealer payments
CREATE POLICY "Admins and territory managers can delete dealer payments"
ON public.dealer_payments
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'territory_sales_manager'::app_role)
);