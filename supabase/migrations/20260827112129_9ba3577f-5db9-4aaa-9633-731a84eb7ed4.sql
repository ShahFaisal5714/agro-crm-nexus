CREATE OR REPLACE FUNCTION public.get_dealer_balances(
  p_dealer_id uuid DEFAULT NULL,
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL
)
RETURNS TABLE (
  dealer_id uuid,
  dealer_name text,
  territory_name text,
  territory_code text,
  total_credit numeric,
  total_paid numeric,
  remaining numeric,
  last_payment_date date
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    d.id,
    d.dealer_name,
    t.name,
    t.code,
    ROUND(COALESCE(c.total_credit, 0), 2),
    ROUND(COALESCE(p.total_paid, 0), 2),
    ROUND(COALESCE(c.total_credit, 0) - COALESCE(p.total_paid, 0), 2),
    p.last_payment_date
  FROM public.dealers d
  LEFT JOIN public.territories t ON t.id = d.territory_id
  LEFT JOIN LATERAL (
    SELECT SUM(dc.amount) AS total_credit
    FROM public.dealer_credits dc
    WHERE dc.dealer_id = d.id
      AND (p_from IS NULL OR dc.credit_date >= p_from)
      AND (p_to IS NULL OR dc.credit_date <= p_to)
  ) c ON TRUE
  LEFT JOIN LATERAL (
    SELECT SUM(dp.amount) AS total_paid, MAX(dp.payment_date) AS last_payment_date
    FROM public.dealer_payments dp
    WHERE dp.dealer_id = d.id
      AND (p_from IS NULL OR dp.payment_date >= p_from)
      AND (p_to IS NULL OR dp.payment_date <= p_to)
  ) p ON TRUE
  WHERE (p_dealer_id IS NULL OR d.id = p_dealer_id)
    AND (COALESCE(c.total_credit, 0) <> 0 OR COALESCE(p.total_paid, 0) <> 0)
  ORDER BY d.dealer_name;
$$;

GRANT EXECUTE ON FUNCTION public.get_dealer_balances(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dealer_balances(uuid, date, date) TO service_role;