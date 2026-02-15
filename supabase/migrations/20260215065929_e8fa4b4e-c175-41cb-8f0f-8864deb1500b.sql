-- Add supplier rating columns to purchases table
ALTER TABLE public.purchases 
ADD COLUMN IF NOT EXISTS quality_rating integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS delivery_rating integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS price_rating integer DEFAULT NULL,
ADD COLUMN IF NOT EXISTS supplier_notes text DEFAULT NULL;

-- Add validation trigger for ratings
CREATE OR REPLACE FUNCTION public.validate_purchase_ratings()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.quality_rating IS NOT NULL AND (NEW.quality_rating < 1 OR NEW.quality_rating > 5) THEN
    RAISE EXCEPTION 'Quality rating must be between 1 and 5';
  END IF;
  IF NEW.delivery_rating IS NOT NULL AND (NEW.delivery_rating < 1 OR NEW.delivery_rating > 5) THEN
    RAISE EXCEPTION 'Delivery rating must be between 1 and 5';
  END IF;
  IF NEW.price_rating IS NOT NULL AND (NEW.price_rating < 1 OR NEW.price_rating > 5) THEN
    RAISE EXCEPTION 'Price rating must be between 1 and 5';
  END IF;
  IF NEW.supplier_notes IS NOT NULL AND length(NEW.supplier_notes) > 1000 THEN
    RAISE EXCEPTION 'Supplier notes must be less than 1000 characters';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER validate_purchase_ratings_trigger
BEFORE INSERT OR UPDATE ON public.purchases
FOR EACH ROW
EXECUTE FUNCTION public.validate_purchase_ratings();