-- Drop all existing restrictive policies on dealers
DROP POLICY IF EXISTS "Admins can manage all dealers" ON public.dealers;
DROP POLICY IF EXISTS "Dealers can view own data" ON public.dealers;
DROP POLICY IF EXISTS "Territory managers can view their territory dealers" ON public.dealers;

-- Recreate as PERMISSIVE policies (default behavior)
CREATE POLICY "Admins can manage all dealers" 
ON public.dealers 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Dealers can view own data" 
ON public.dealers 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Territory managers can view their territory dealers" 
ON public.dealers 
FOR SELECT 
USING (
  has_role(auth.uid(), 'territory_sales_manager'::app_role) 
  AND territory_id IN (
    SELECT t.id
    FROM territories t
    JOIN user_roles ur ON ur.territory = t.code
    WHERE ur.user_id = auth.uid()
  )
);