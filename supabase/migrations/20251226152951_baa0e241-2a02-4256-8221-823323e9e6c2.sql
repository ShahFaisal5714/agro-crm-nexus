-- Add DELETE policy for expenses table
CREATE POLICY "Users can delete own expenses"
ON public.expenses
FOR DELETE
USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));