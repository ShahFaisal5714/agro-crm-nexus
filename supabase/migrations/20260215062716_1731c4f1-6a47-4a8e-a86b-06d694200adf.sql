
-- Create territory_officers table
CREATE TABLE public.territory_officers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  officer_name TEXT NOT NULL,
  phone TEXT,
  territory_id UUID UNIQUE REFERENCES public.territories(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.territory_officers ENABLE ROW LEVEL SECURITY;

-- Admins can manage all
CREATE POLICY "Admins can manage territory officers"
ON public.territory_officers
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Accountants can manage territory officers
CREATE POLICY "Accountants can manage territory officers"
ON public.territory_officers
FOR ALL
USING (has_role(auth.uid(), 'accountant'::app_role));

-- All authenticated users can view
CREATE POLICY "All authenticated can view territory officers"
ON public.territory_officers
FOR SELECT
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_territory_officers_updated_at
BEFORE UPDATE ON public.territory_officers
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
