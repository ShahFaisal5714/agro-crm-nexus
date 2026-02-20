-- Allow accountants to view all expenses
CREATE POLICY "Accountants can view expenses"
ON public.expenses
FOR SELECT
USING (has_role(auth.uid(), 'accountant'::app_role));

-- Allow accountants to create expenses
CREATE POLICY "Accountants can insert expenses"
ON public.expenses
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'accountant'::app_role));

-- Allow accountants to update expenses
CREATE POLICY "Accountants can update expenses"
ON public.expenses
FOR UPDATE
USING (has_role(auth.uid(), 'accountant'::app_role));

-- Allow accountants to delete expenses
CREATE POLICY "Accountants can delete expenses"
ON public.expenses
FOR DELETE
USING (has_role(auth.uid(), 'accountant'::app_role));