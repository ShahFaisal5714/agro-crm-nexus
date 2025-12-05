-- Allow admins and territory managers to delete sales order items
CREATE POLICY "Users can delete sales order items if they can delete orders"
ON public.sales_order_items
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'territory_sales_manager'::app_role)
);

-- Allow admins and territory managers to delete sales orders
CREATE POLICY "Admins and territory managers can delete sales orders"
ON public.sales_orders
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  (has_role(auth.uid(), 'territory_sales_manager'::app_role) AND 
   dealer_id IN (
     SELECT d.id FROM dealers d
     JOIN user_roles ur ON ur.territory = (SELECT territories.code FROM territories WHERE territories.id = d.territory_id)
     WHERE ur.user_id = auth.uid()
   ))
);