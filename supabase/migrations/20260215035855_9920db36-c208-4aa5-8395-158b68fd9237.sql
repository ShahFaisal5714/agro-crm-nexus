
-- Allow accountants to insert sales orders
CREATE POLICY "Accountants can insert sales orders"
ON public.sales_orders FOR INSERT
WITH CHECK (has_role(auth.uid(), 'accountant'::app_role));

-- Allow accountants to update sales orders
CREATE POLICY "Accountants can update sales orders"
ON public.sales_orders FOR UPDATE
USING (has_role(auth.uid(), 'accountant'::app_role));

-- Allow accountants to delete sales orders
CREATE POLICY "Accountants can delete sales orders"
ON public.sales_orders FOR DELETE
USING (has_role(auth.uid(), 'accountant'::app_role));

-- Allow accountants to insert sales order items
CREATE POLICY "Accountants can insert sales order items"
ON public.sales_order_items FOR INSERT
WITH CHECK (has_role(auth.uid(), 'accountant'::app_role));

-- Allow accountants to delete sales order items
CREATE POLICY "Accountants can delete sales order items"
ON public.sales_order_items FOR DELETE
USING (has_role(auth.uid(), 'accountant'::app_role));

-- Allow accountants to manage products
CREATE POLICY "Accountants can insert products"
ON public.products FOR INSERT
WITH CHECK (has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Accountants can update products"
ON public.products FOR UPDATE
USING (has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Accountants can delete products"
ON public.products FOR DELETE
USING (has_role(auth.uid(), 'accountant'::app_role));

-- Allow accountants to manage dealer credits
CREATE POLICY "Accountants can insert dealer credits"
ON public.dealer_credits FOR INSERT
WITH CHECK (has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Accountants can update dealer credits"
ON public.dealer_credits FOR UPDATE
USING (has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Accountants can delete dealer credits"
ON public.dealer_credits FOR DELETE
USING (has_role(auth.uid(), 'accountant'::app_role));

-- Allow accountants to manage dealer payments
CREATE POLICY "Accountants can insert dealer payments"
ON public.dealer_payments FOR INSERT
WITH CHECK (has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Accountants can update dealer payments"
ON public.dealer_payments FOR UPDATE
USING (has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Accountants can delete dealer payments"
ON public.dealer_payments FOR DELETE
USING (has_role(auth.uid(), 'accountant'::app_role));

-- Allow accountants to manage invoices
CREATE POLICY "Accountants can insert invoices"
ON public.invoices FOR INSERT
WITH CHECK (has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Accountants can update invoices"
ON public.invoices FOR UPDATE
USING (has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Accountants can delete invoices"
ON public.invoices FOR DELETE
USING (has_role(auth.uid(), 'accountant'::app_role));

-- Allow accountants to manage invoice items
CREATE POLICY "Accountants can insert invoice items"
ON public.invoice_items FOR INSERT
WITH CHECK (has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Accountants can delete invoice items"
ON public.invoice_items FOR DELETE
USING (has_role(auth.uid(), 'accountant'::app_role));

-- Allow accountants to manage invoice payments
CREATE POLICY "Accountants can insert invoice payments"
ON public.invoice_payments FOR INSERT
WITH CHECK (has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Accountants can update invoice payments"
ON public.invoice_payments FOR UPDATE
USING (has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Accountants can delete invoice payments"
ON public.invoice_payments FOR DELETE
USING (has_role(auth.uid(), 'accountant'::app_role));

-- Allow accountants to manage policies
CREATE POLICY "Accountants can insert policies"
ON public.policies FOR INSERT
WITH CHECK (has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Accountants can update policies"
ON public.policies FOR UPDATE
USING (has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Accountants can delete policies"
ON public.policies FOR DELETE
USING (has_role(auth.uid(), 'accountant'::app_role));

-- Allow accountants to manage policy items
CREATE POLICY "Accountants can insert policy items"
ON public.policy_items FOR INSERT
WITH CHECK (has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Accountants can update policy items"
ON public.policy_items FOR UPDATE
USING (has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Accountants can delete policy items"
ON public.policy_items FOR DELETE
USING (has_role(auth.uid(), 'accountant'::app_role));

-- Allow accountants to manage policy payments
CREATE POLICY "Accountants can insert policy payments"
ON public.policy_payments FOR INSERT
WITH CHECK (has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Accountants can update policy payments"
ON public.policy_payments FOR UPDATE
USING (has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Accountants can delete policy payments"
ON public.policy_payments FOR DELETE
USING (has_role(auth.uid(), 'accountant'::app_role));

-- Allow accountants to manage dealers
CREATE POLICY "Accountants can insert dealers"
ON public.dealers FOR INSERT
WITH CHECK (has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Accountants can update dealers"
ON public.dealers FOR UPDATE
USING (has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Accountants can delete dealers"
ON public.dealers FOR DELETE
USING (has_role(auth.uid(), 'accountant'::app_role));

-- Allow accountants to manage cash transactions
CREATE POLICY "Accountants can view cash transactions"
ON public.cash_transactions FOR SELECT
USING (has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Accountants can insert cash transactions"
ON public.cash_transactions FOR INSERT
WITH CHECK (has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Accountants can update cash transactions"
ON public.cash_transactions FOR UPDATE
USING (has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Accountants can delete cash transactions"
ON public.cash_transactions FOR DELETE
USING (has_role(auth.uid(), 'accountant'::app_role));

-- Allow accountants to manage product categories
CREATE POLICY "Accountants can insert categories"
ON public.product_categories FOR INSERT
WITH CHECK (has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Accountants can update categories"
ON public.product_categories FOR UPDATE
USING (has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Accountants can delete categories"
ON public.product_categories FOR DELETE
USING (has_role(auth.uid(), 'accountant'::app_role));
