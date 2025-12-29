-- Add validation triggers for key tables to enforce server-side input validation

-- Create a domain for email validation
CREATE OR REPLACE FUNCTION public.validate_email(email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF email IS NULL THEN
    RETURN TRUE;
  END IF;
  RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$;

-- Create validation function for dealers
CREATE OR REPLACE FUNCTION public.validate_dealer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Validate dealer_name length
  IF length(NEW.dealer_name) > 200 THEN
    RAISE EXCEPTION 'Dealer name must be less than 200 characters';
  END IF;
  
  -- Validate email format if provided
  IF NEW.email IS NOT NULL AND NOT validate_email(NEW.email) THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  -- Validate phone format (allow digits, spaces, dashes, parentheses, plus sign)
  IF NEW.phone IS NOT NULL AND length(NEW.phone) > 20 THEN
    RAISE EXCEPTION 'Phone number must be less than 20 characters';
  END IF;
  
  -- Validate GST number format (Indian GST: 15 alphanumeric characters)
  IF NEW.gst_number IS NOT NULL AND (length(NEW.gst_number) < 10 OR length(NEW.gst_number) > 20) THEN
    RAISE EXCEPTION 'GST number must be between 10 and 20 characters';
  END IF;
  
  -- Validate address length
  IF NEW.address IS NOT NULL AND length(NEW.address) > 500 THEN
    RAISE EXCEPTION 'Address must be less than 500 characters';
  END IF;
  
  -- Validate contact person length
  IF NEW.contact_person IS NOT NULL AND length(NEW.contact_person) > 200 THEN
    RAISE EXCEPTION 'Contact person name must be less than 200 characters';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for dealers validation
DROP TRIGGER IF EXISTS validate_dealer_trigger ON public.dealers;
CREATE TRIGGER validate_dealer_trigger
  BEFORE INSERT OR UPDATE ON public.dealers
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_dealer();

-- Create validation function for suppliers
CREATE OR REPLACE FUNCTION public.validate_supplier()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Validate name length
  IF length(NEW.name) > 200 THEN
    RAISE EXCEPTION 'Supplier name must be less than 200 characters';
  END IF;
  
  -- Validate email format if provided
  IF NEW.email IS NOT NULL AND NOT validate_email(NEW.email) THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  -- Validate phone length
  IF NEW.phone IS NOT NULL AND length(NEW.phone) > 20 THEN
    RAISE EXCEPTION 'Phone number must be less than 20 characters';
  END IF;
  
  -- Validate GST number format
  IF NEW.gst_number IS NOT NULL AND (length(NEW.gst_number) < 10 OR length(NEW.gst_number) > 20) THEN
    RAISE EXCEPTION 'GST number must be between 10 and 20 characters';
  END IF;
  
  -- Validate address length
  IF NEW.address IS NOT NULL AND length(NEW.address) > 500 THEN
    RAISE EXCEPTION 'Address must be less than 500 characters';
  END IF;
  
  -- Validate contact person length
  IF NEW.contact_person IS NOT NULL AND length(NEW.contact_person) > 200 THEN
    RAISE EXCEPTION 'Contact person name must be less than 200 characters';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for suppliers validation
DROP TRIGGER IF EXISTS validate_supplier_trigger ON public.suppliers;
CREATE TRIGGER validate_supplier_trigger
  BEFORE INSERT OR UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_supplier();

-- Create validation function for products
CREATE OR REPLACE FUNCTION public.validate_product()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Validate name length
  IF length(NEW.name) > 200 THEN
    RAISE EXCEPTION 'Product name must be less than 200 characters';
  END IF;
  
  -- Validate SKU length
  IF length(NEW.sku) > 50 THEN
    RAISE EXCEPTION 'SKU must be less than 50 characters';
  END IF;
  
  -- Validate unit_price is positive
  IF NEW.unit_price < 0 THEN
    RAISE EXCEPTION 'Unit price must be a positive value';
  END IF;
  
  -- Validate stock_quantity is non-negative
  IF NEW.stock_quantity < 0 THEN
    RAISE EXCEPTION 'Stock quantity cannot be negative';
  END IF;
  
  -- Validate description length
  IF NEW.description IS NOT NULL AND length(NEW.description) > 1000 THEN
    RAISE EXCEPTION 'Description must be less than 1000 characters';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for products validation
DROP TRIGGER IF EXISTS validate_product_trigger ON public.products;
CREATE TRIGGER validate_product_trigger
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_product();

-- Create validation function for territories
CREATE OR REPLACE FUNCTION public.validate_territory()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Validate name length
  IF length(NEW.name) > 100 THEN
    RAISE EXCEPTION 'Territory name must be less than 100 characters';
  END IF;
  
  -- Validate code length
  IF length(NEW.code) > 20 THEN
    RAISE EXCEPTION 'Territory code must be less than 20 characters';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for territories validation
DROP TRIGGER IF EXISTS validate_territory_trigger ON public.territories;
CREATE TRIGGER validate_territory_trigger
  BEFORE INSERT OR UPDATE ON public.territories
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_territory();

-- Create validation function for expenses
CREATE OR REPLACE FUNCTION public.validate_expense()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Validate amount is positive
  IF NEW.amount <= 0 THEN
    RAISE EXCEPTION 'Expense amount must be a positive value';
  END IF;
  
  -- Validate category length
  IF length(NEW.category) > 100 THEN
    RAISE EXCEPTION 'Category must be less than 100 characters';
  END IF;
  
  -- Validate description length
  IF NEW.description IS NOT NULL AND length(NEW.description) > 1000 THEN
    RAISE EXCEPTION 'Description must be less than 1000 characters';
  END IF;
  
  -- Validate expense_date is not in the future
  IF NEW.expense_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'Expense date cannot be in the future';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for expenses validation
DROP TRIGGER IF EXISTS validate_expense_trigger ON public.expenses;
CREATE TRIGGER validate_expense_trigger
  BEFORE INSERT OR UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_expense();

-- Create validation function for sales_orders
CREATE OR REPLACE FUNCTION public.validate_sales_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Validate total_amount is non-negative
  IF NEW.total_amount < 0 THEN
    RAISE EXCEPTION 'Total amount cannot be negative';
  END IF;
  
  -- Validate notes length
  IF NEW.notes IS NOT NULL AND length(NEW.notes) > 1000 THEN
    RAISE EXCEPTION 'Notes must be less than 1000 characters';
  END IF;
  
  -- Validate status
  IF NEW.status NOT IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid order status';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for sales_orders validation
DROP TRIGGER IF EXISTS validate_sales_order_trigger ON public.sales_orders;
CREATE TRIGGER validate_sales_order_trigger
  BEFORE INSERT OR UPDATE ON public.sales_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_sales_order();

-- Create validation function for purchases
CREATE OR REPLACE FUNCTION public.validate_purchase()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Validate total_amount is non-negative
  IF NEW.total_amount < 0 THEN
    RAISE EXCEPTION 'Total amount cannot be negative';
  END IF;
  
  -- Validate notes length
  IF NEW.notes IS NOT NULL AND length(NEW.notes) > 1000 THEN
    RAISE EXCEPTION 'Notes must be less than 1000 characters';
  END IF;
  
  -- Validate status
  IF NEW.status NOT IN ('pending', 'confirmed', 'received', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid purchase status';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for purchases validation
DROP TRIGGER IF EXISTS validate_purchase_trigger ON public.purchases;
CREATE TRIGGER validate_purchase_trigger
  BEFORE INSERT OR UPDATE ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_purchase();

-- Create validation function for invoices
CREATE OR REPLACE FUNCTION public.validate_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Validate amounts are non-negative
  IF NEW.subtotal < 0 OR NEW.tax_amount < 0 OR NEW.total_amount < 0 THEN
    RAISE EXCEPTION 'Invoice amounts cannot be negative';
  END IF;
  
  -- Validate tax_rate is between 0 and 100
  IF NEW.tax_rate < 0 OR NEW.tax_rate > 100 THEN
    RAISE EXCEPTION 'Tax rate must be between 0 and 100';
  END IF;
  
  -- Validate notes length
  IF NEW.notes IS NOT NULL AND length(NEW.notes) > 1000 THEN
    RAISE EXCEPTION 'Notes must be less than 1000 characters';
  END IF;
  
  -- Validate status
  IF NEW.status NOT IN ('unpaid', 'paid', 'partial', 'overdue', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid invoice status';
  END IF;
  
  -- Validate due_date is after invoice_date
  IF NEW.due_date < NEW.invoice_date THEN
    RAISE EXCEPTION 'Due date must be on or after invoice date';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for invoices validation
DROP TRIGGER IF EXISTS validate_invoice_trigger ON public.invoices;
CREATE TRIGGER validate_invoice_trigger
  BEFORE INSERT OR UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_invoice();

-- Create validation function for product_categories
CREATE OR REPLACE FUNCTION public.validate_product_category()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Validate name length
  IF length(NEW.name) > 100 THEN
    RAISE EXCEPTION 'Category name must be less than 100 characters';
  END IF;
  
  -- Validate description length
  IF NEW.description IS NOT NULL AND length(NEW.description) > 500 THEN
    RAISE EXCEPTION 'Description must be less than 500 characters';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for product_categories validation
DROP TRIGGER IF EXISTS validate_product_category_trigger ON public.product_categories;
CREATE TRIGGER validate_product_category_trigger
  BEFORE INSERT OR UPDATE ON public.product_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_product_category();

-- Create validation function for profiles
CREATE OR REPLACE FUNCTION public.validate_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Validate full_name length
  IF length(NEW.full_name) > 200 THEN
    RAISE EXCEPTION 'Full name must be less than 200 characters';
  END IF;
  
  -- Validate email format
  IF NOT validate_email(NEW.email) THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  -- Validate phone length
  IF NEW.phone IS NOT NULL AND length(NEW.phone) > 20 THEN
    RAISE EXCEPTION 'Phone number must be less than 20 characters';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for profiles validation
DROP TRIGGER IF EXISTS validate_profile_trigger ON public.profiles;
CREATE TRIGGER validate_profile_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_profile();