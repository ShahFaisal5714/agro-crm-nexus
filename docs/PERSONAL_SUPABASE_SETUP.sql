-- =====================================================
-- AGRO CRM - COMPLETE SUPABASE SETUP SCRIPT
-- =====================================================
-- Run this script in your personal Supabase SQL Editor
-- Order matters: Run sections in sequence (1 -> 2 -> 3 -> 4 -> 5)
-- =====================================================

-- =====================================================
-- SECTION 1: ENUMS
-- =====================================================

-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM (
  'admin',
  'territory_sales_manager',
  'dealer',
  'finance',
  'employee'
);

-- =====================================================
-- SECTION 2: TABLES
-- =====================================================

-- 2.1 Profiles table (stores user profile information)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2.2 User roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  territory TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 2.3 Territories table
CREATE TABLE IF NOT EXISTS public.territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2.4 Product categories table
CREATE TABLE IF NOT EXISTS public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2.5 Products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  unit_price NUMERIC NOT NULL,
  cost_price NUMERIC DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL DEFAULT 'units',
  pack_size TEXT,
  category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2.6 Suppliers table
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  gst_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2.7 Dealers table
CREATE TABLE IF NOT EXISTS public.dealers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  territory_id UUID REFERENCES public.territories(id) ON DELETE SET NULL,
  dealer_name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  gst_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2.8 Purchases table
CREATE TABLE IF NOT EXISTS public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_number TEXT NOT NULL UNIQUE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2.9 Purchase items table
CREATE TABLE IF NOT EXISTS public.purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  total NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2.10 Sales orders table
CREATE TABLE IF NOT EXISTS public.sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2.11 Sales order items table
CREATE TABLE IF NOT EXISTS public.sales_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  total NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2.12 Invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  sales_order_id UUID REFERENCES public.sales_orders(id) ON DELETE SET NULL,
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  paid_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'unpaid',
  source TEXT DEFAULT 'manual',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2.13 Invoice items table
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  total NUMERIC NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2.14 Invoice payments table
CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  reference_number TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2.15 Policies table (booking/advance orders)
CREATE TABLE IF NOT EXISTS public.policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_number TEXT NOT NULL UNIQUE,
  name TEXT,
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  rate_per_unit NUMERIC NOT NULL,
  total_amount NUMERIC NOT NULL,
  advance_amount NUMERIC NOT NULL DEFAULT 0,
  remaining_amount NUMERIC GENERATED ALWAYS AS (total_amount - advance_amount) STORED,
  status TEXT NOT NULL DEFAULT 'pending',
  start_date DATE,
  end_date DATE,
  expected_delivery_date DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2.16 Policy items table
CREATE TABLE IF NOT EXISTS public.policy_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  rate_per_unit NUMERIC NOT NULL,
  total NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2.17 Policy payments table
CREATE TABLE IF NOT EXISTS public.policy_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  reference_number TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2.18 Dealer credits table
CREATE TABLE IF NOT EXISTS public.dealer_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  credit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2.19 Dealer payments table
CREATE TABLE IF NOT EXISTS public.dealer_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dealer_id UUID NOT NULL REFERENCES public.dealers(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  reference_number TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2.20 Supplier credits table
CREATE TABLE IF NOT EXISTS public.supplier_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  credit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2.21 Supplier payments table
CREATE TABLE IF NOT EXISTS public.supplier_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  reference_number TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2.22 Expenses table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  receipt_url TEXT,
  territory TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2.23 Cash transactions table
CREATE TABLE IF NOT EXISTS public.cash_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  reference_id TEXT,
  reference_type TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2.24 Audit logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2.25 Backup history table
CREATE TABLE IF NOT EXISTS public.backup_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  total_records INTEGER NOT NULL DEFAULT 0,
  table_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  triggered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_incremental BOOLEAN NOT NULL DEFAULT false,
  incremental_since TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  notification_email TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- SECTION 3: DATABASE FUNCTIONS
-- =====================================================

-- 3.1 Email validation function
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

-- 3.2 Has role function (CRITICAL - used by RLS policies)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 3.3 Get user territory function
CREATE OR REPLACE FUNCTION public.get_user_territory(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT territory
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- 3.4 Handle new user function (auto-create profile on signup)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.email
  );
  
  -- Assign default 'employee' role to new users
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'employee');
  
  RETURN NEW;
END;
$$;

-- 3.5 Handle updated_at function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 3.6 Generate order number function
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
  order_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.sales_orders
  WHERE order_number ~ '^SO-[0-9]+$';
  
  order_num := 'SO-' || LPAD(next_num::TEXT, 6, '0');
  RETURN order_num;
END;
$$;

-- 3.7 Generate purchase number function
CREATE OR REPLACE FUNCTION public.generate_purchase_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
  purchase_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(purchase_number FROM 4) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.purchases
  WHERE purchase_number ~ '^PO-[0-9]+$';
  
  purchase_num := 'PO-' || LPAD(next_num::TEXT, 6, '0');
  RETURN purchase_num;
END;
$$;

-- 3.8 Generate invoice number function
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
  invoice_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.invoices
  WHERE invoice_number ~ '^INV-[0-9]+$';
  
  invoice_num := 'INV-' || LPAD(next_num::TEXT, 6, '0');
  RETURN invoice_num;
END;
$$;

-- 3.9 Generate policy number function
CREATE OR REPLACE FUNCTION public.generate_policy_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
  policy_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(policy_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_num
  FROM public.policies
  WHERE policy_number ~ '^POL-[0-9]+$';
  
  policy_num := 'POL-' || LPAD(next_num::TEXT, 6, '0');
  RETURN policy_num;
END;
$$;

-- 3.10 Insert audit log function
CREATE OR REPLACE FUNCTION public.insert_audit_log(
  p_user_id UUID,
  p_user_email TEXT,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (user_id, user_email, action, entity_type, entity_id, details, ip_address)
  VALUES (p_user_id, p_user_email, p_action, p_entity_type, p_entity_id, p_details, p_ip_address)
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- 3.11 Update policy status function
CREATE OR REPLACE FUNCTION public.update_policy_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  policy_total NUMERIC;
  total_paid NUMERIC;
BEGIN
  -- Get the policy total
  SELECT total_amount INTO policy_total FROM policies WHERE id = NEW.policy_id;
  
  -- Calculate total payments
  SELECT COALESCE(SUM(amount), 0) INTO total_paid 
  FROM policy_payments WHERE policy_id = NEW.policy_id;
  
  -- Update the policy advance amount and status
  UPDATE policies 
  SET 
    advance_amount = total_paid,
    status = CASE 
      WHEN total_paid >= policy_total THEN 'paid'
      WHEN total_paid > 0 THEN 'partial'
      ELSE 'pending'
    END
  WHERE id = NEW.policy_id;
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- SECTION 4: TRIGGERS
-- =====================================================

-- 4.1 Create profile on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4.2 Update timestamps triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_purchases_updated_at
  BEFORE UPDATE ON public.purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_sales_orders_updated_at
  BEFORE UPDATE ON public.sales_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_policies_updated_at
  BEFORE UPDATE ON public.policies
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 4.3 Policy payment status update trigger
CREATE TRIGGER update_policy_status_on_payment
  AFTER INSERT OR UPDATE OR DELETE ON public.policy_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_policy_status();

-- =====================================================
-- SECTION 5: ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.policy_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_history ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 5.1 PROFILES POLICIES
-- =====================================================
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- 5.2 USER ROLES POLICIES
-- =====================================================
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- 5.3 TERRITORIES POLICIES
-- =====================================================
CREATE POLICY "All authenticated users can view territories" ON public.territories
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage territories" ON public.territories
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- 5.4 PRODUCT CATEGORIES POLICIES
-- =====================================================
CREATE POLICY "All authenticated users can view categories" ON public.product_categories
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories" ON public.product_categories
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- 5.5 PRODUCTS POLICIES
-- =====================================================
CREATE POLICY "All authenticated users can view products" ON public.products
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage products" ON public.products
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- 5.6 SUPPLIERS POLICIES
-- =====================================================
CREATE POLICY "All authenticated users can view suppliers" ON public.suppliers
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage suppliers" ON public.suppliers
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- 5.7 DEALERS POLICIES
-- =====================================================
CREATE POLICY "Admins can manage all dealers" ON public.dealers
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Dealers can view own data" ON public.dealers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Territory managers can view their territory dealers" ON public.dealers
  FOR SELECT USING (
    has_role(auth.uid(), 'territory_sales_manager') AND 
    territory_id IN (
      SELECT t.id FROM territories t
      JOIN user_roles ur ON ur.territory = t.code
      WHERE ur.user_id = auth.uid()
    )
  );

CREATE POLICY "Territory managers can insert dealers" ON public.dealers
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'territory_sales_manager')
  );

CREATE POLICY "Territory managers can update their territory dealers" ON public.dealers
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin') OR 
    (has_role(auth.uid(), 'territory_sales_manager') AND 
     territory_id IN (
       SELECT t.id FROM territories t
       JOIN user_roles ur ON ur.territory = t.code
       WHERE ur.user_id = auth.uid()
     ))
  );

CREATE POLICY "Territory managers can delete their territory dealers" ON public.dealers
  FOR DELETE USING (
    has_role(auth.uid(), 'admin') OR 
    (has_role(auth.uid(), 'territory_sales_manager') AND 
     territory_id IN (
       SELECT t.id FROM territories t
       JOIN user_roles ur ON ur.territory = t.code
       WHERE ur.user_id = auth.uid()
     ))
  );

-- =====================================================
-- 5.8 PURCHASES POLICIES
-- =====================================================
CREATE POLICY "Admins can view all purchases" ON public.purchases
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Territory managers can view their purchases" ON public.purchases
  FOR SELECT USING (
    has_role(auth.uid(), 'territory_sales_manager') AND 
    created_by = auth.uid()
  );

CREATE POLICY "Admins and territory managers can create purchases" ON public.purchases
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'territory_sales_manager')
  );

CREATE POLICY "Admins and territory managers can update purchases" ON public.purchases
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin') OR 
    (has_role(auth.uid(), 'territory_sales_manager') AND created_by = auth.uid())
  );

CREATE POLICY "Admins can delete purchases" ON public.purchases
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- 5.9 PURCHASE ITEMS POLICIES
-- =====================================================
CREATE POLICY "Users can view purchase items if they can view the purchase" ON public.purchase_items
  FOR SELECT USING (purchase_id IN (SELECT id FROM purchases));

CREATE POLICY "Admins and territory managers can insert purchase items" ON public.purchase_items
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'territory_sales_manager')
  );

CREATE POLICY "Admins can delete purchase items" ON public.purchase_items
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- 5.10 SALES ORDERS POLICIES
-- =====================================================
CREATE POLICY "Admins can view all sales orders" ON public.sales_orders
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Dealers can view own sales orders" ON public.sales_orders
  FOR SELECT USING (
    has_role(auth.uid(), 'dealer') AND 
    dealer_id IN (SELECT id FROM dealers WHERE user_id = auth.uid())
  );

CREATE POLICY "Territory managers can view their territory sales orders" ON public.sales_orders
  FOR SELECT USING (
    has_role(auth.uid(), 'territory_sales_manager') AND 
    dealer_id IN (
      SELECT d.id FROM dealers d
      JOIN user_roles ur ON ur.territory = (SELECT code FROM territories WHERE id = d.territory_id)
      WHERE ur.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins and territory managers can create sales orders" ON public.sales_orders
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'territory_sales_manager')
  );

CREATE POLICY "Admins and territory managers can update sales orders" ON public.sales_orders
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin') OR 
    (has_role(auth.uid(), 'territory_sales_manager') AND 
     dealer_id IN (
       SELECT d.id FROM dealers d
       JOIN user_roles ur ON ur.territory = (SELECT code FROM territories WHERE id = d.territory_id)
       WHERE ur.user_id = auth.uid()
     ))
  );

CREATE POLICY "Admins and territory managers can delete sales orders" ON public.sales_orders
  FOR DELETE USING (
    has_role(auth.uid(), 'admin') OR 
    (has_role(auth.uid(), 'territory_sales_manager') AND 
     dealer_id IN (
       SELECT d.id FROM dealers d
       JOIN user_roles ur ON ur.territory = (SELECT code FROM territories WHERE id = d.territory_id)
       WHERE ur.user_id = auth.uid()
     ))
  );

-- =====================================================
-- 5.11 SALES ORDER ITEMS POLICIES
-- =====================================================
CREATE POLICY "Users can view sales order items if they can view the order" ON public.sales_order_items
  FOR SELECT USING (sales_order_id IN (SELECT id FROM sales_orders));

CREATE POLICY "Users can insert sales order items if they can create orders" ON public.sales_order_items
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'territory_sales_manager')
  );

CREATE POLICY "Users can delete sales order items if they can delete orders" ON public.sales_order_items
  FOR DELETE USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'territory_sales_manager')
  );

-- =====================================================
-- 5.12 INVOICES POLICIES
-- =====================================================
CREATE POLICY "Admins can manage all invoices" ON public.invoices
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Dealers can view own invoices" ON public.invoices
  FOR SELECT USING (
    has_role(auth.uid(), 'dealer') AND 
    dealer_id IN (SELECT id FROM dealers WHERE user_id = auth.uid())
  );

CREATE POLICY "Territory managers can view their territory invoices" ON public.invoices
  FOR SELECT USING (
    has_role(auth.uid(), 'territory_sales_manager') AND 
    dealer_id IN (
      SELECT d.id FROM dealers d
      JOIN user_roles ur ON ur.territory = (SELECT code FROM territories WHERE id = d.territory_id)
      WHERE ur.user_id = auth.uid()
    )
  );

CREATE POLICY "Territory managers can create invoices" ON public.invoices
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'territory_sales_manager')
  );

CREATE POLICY "Territory managers can update their territory invoices" ON public.invoices
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin') OR 
    (has_role(auth.uid(), 'territory_sales_manager') AND 
     dealer_id IN (
       SELECT d.id FROM dealers d
       JOIN user_roles ur ON ur.territory = (SELECT code FROM territories WHERE id = d.territory_id)
       WHERE ur.user_id = auth.uid()
     ))
  );

CREATE POLICY "Territory managers can delete their territory invoices" ON public.invoices
  FOR DELETE USING (
    has_role(auth.uid(), 'admin') OR 
    (has_role(auth.uid(), 'territory_sales_manager') AND 
     dealer_id IN (
       SELECT d.id FROM dealers d
       JOIN user_roles ur ON ur.territory = (SELECT code FROM territories WHERE id = d.territory_id)
       WHERE ur.user_id = auth.uid()
     ))
  );

-- =====================================================
-- 5.13 INVOICE ITEMS POLICIES
-- =====================================================
CREATE POLICY "Users can view invoice items if they can view the invoice" ON public.invoice_items
  FOR SELECT USING (invoice_id IN (SELECT id FROM invoices));

CREATE POLICY "Users can insert invoice items if they can create invoices" ON public.invoice_items
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'territory_sales_manager')
  );

CREATE POLICY "Users can delete invoice items" ON public.invoice_items
  FOR DELETE USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'territory_sales_manager')
  );

-- =====================================================
-- 5.14 INVOICE PAYMENTS POLICIES
-- =====================================================
CREATE POLICY "Admins can manage all invoice payments" ON public.invoice_payments
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Territory managers can view invoice payments" ON public.invoice_payments
  FOR SELECT USING (invoice_id IN (SELECT id FROM invoices));

CREATE POLICY "Territory managers can insert invoice payments" ON public.invoice_payments
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'territory_sales_manager')
  );

CREATE POLICY "Territory managers can update invoice payments" ON public.invoice_payments
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'territory_sales_manager')
  );

CREATE POLICY "Territory managers can delete invoice payments" ON public.invoice_payments
  FOR DELETE USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'territory_sales_manager')
  );

-- =====================================================
-- 5.15 POLICIES (BOOKINGS) POLICIES
-- =====================================================
CREATE POLICY "Admins can manage all policies" ON public.policies
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Dealers can view their own policies" ON public.policies
  FOR SELECT USING (
    has_role(auth.uid(), 'dealer') AND 
    dealer_id IN (SELECT id FROM dealers WHERE user_id = auth.uid())
  );

CREATE POLICY "Territory managers can view their territory policies" ON public.policies
  FOR SELECT USING (
    has_role(auth.uid(), 'territory_sales_manager') AND 
    dealer_id IN (
      SELECT d.id FROM dealers d
      JOIN user_roles ur ON ur.territory = (SELECT code FROM territories WHERE id = d.territory_id)
      WHERE ur.user_id = auth.uid()
    )
  );

CREATE POLICY "Territory managers can create policies" ON public.policies
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'territory_sales_manager')
  );

CREATE POLICY "Territory managers can update their territory policies" ON public.policies
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin') OR 
    (has_role(auth.uid(), 'territory_sales_manager') AND 
     dealer_id IN (
       SELECT d.id FROM dealers d
       JOIN user_roles ur ON ur.territory = (SELECT code FROM territories WHERE id = d.territory_id)
       WHERE ur.user_id = auth.uid()
     ))
  );

CREATE POLICY "Territory managers can delete their territory policies" ON public.policies
  FOR DELETE USING (
    has_role(auth.uid(), 'admin') OR 
    (has_role(auth.uid(), 'territory_sales_manager') AND 
     dealer_id IN (
       SELECT d.id FROM dealers d
       JOIN user_roles ur ON ur.territory = (SELECT code FROM territories WHERE id = d.territory_id)
       WHERE ur.user_id = auth.uid()
     ))
  );

-- =====================================================
-- 5.16 POLICY ITEMS POLICIES
-- =====================================================
CREATE POLICY "Users can view policy items if they can view the policy" ON public.policy_items
  FOR SELECT USING (policy_id IN (SELECT id FROM policies));

CREATE POLICY "Users can insert policy items" ON public.policy_items
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'territory_sales_manager')
  );

CREATE POLICY "Users can update policy items" ON public.policy_items
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'territory_sales_manager')
  );

CREATE POLICY "Users can delete policy items" ON public.policy_items
  FOR DELETE USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'territory_sales_manager')
  );

-- =====================================================
-- 5.17 POLICY PAYMENTS POLICIES
-- =====================================================
CREATE POLICY "Admins can manage all policy payments" ON public.policy_payments
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view policy payments if they can view the policy" ON public.policy_payments
  FOR SELECT USING (policy_id IN (SELECT id FROM policies));

CREATE POLICY "Users can insert policy payments" ON public.policy_payments
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'territory_sales_manager')
  );

-- =====================================================
-- 5.18 DEALER CREDITS POLICIES
-- =====================================================
CREATE POLICY "Admins can manage all dealer credits" ON public.dealer_credits
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Dealers can view own credits" ON public.dealer_credits
  FOR SELECT USING (
    has_role(auth.uid(), 'dealer') AND 
    dealer_id IN (SELECT id FROM dealers WHERE user_id = auth.uid())
  );

CREATE POLICY "Territory managers can view their territory dealer credits" ON public.dealer_credits
  FOR SELECT USING (
    has_role(auth.uid(), 'territory_sales_manager') AND 
    dealer_id IN (
      SELECT d.id FROM dealers d
      JOIN user_roles ur ON ur.territory = (SELECT code FROM territories WHERE id = d.territory_id)
      WHERE ur.user_id = auth.uid()
    )
  );

CREATE POLICY "Territory managers can insert dealer credits" ON public.dealer_credits
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'territory_sales_manager')
  );

CREATE POLICY "Admins and territory managers can update dealer credits" ON public.dealer_credits
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'territory_sales_manager')
  );

CREATE POLICY "Admins and territory managers can delete dealer credits" ON public.dealer_credits
  FOR DELETE USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'territory_sales_manager')
  );

-- =====================================================
-- 5.19 DEALER PAYMENTS POLICIES
-- =====================================================
CREATE POLICY "Admins can manage all dealer payments" ON public.dealer_payments
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Dealers can view own payments" ON public.dealer_payments
  FOR SELECT USING (
    has_role(auth.uid(), 'dealer') AND 
    dealer_id IN (SELECT id FROM dealers WHERE user_id = auth.uid())
  );

CREATE POLICY "Territory managers can view their territory dealer payments" ON public.dealer_payments
  FOR SELECT USING (
    has_role(auth.uid(), 'territory_sales_manager') AND 
    dealer_id IN (
      SELECT d.id FROM dealers d
      JOIN user_roles ur ON ur.territory = (SELECT code FROM territories WHERE id = d.territory_id)
      WHERE ur.user_id = auth.uid()
    )
  );

CREATE POLICY "Territory managers can insert dealer payments" ON public.dealer_payments
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'territory_sales_manager')
  );

CREATE POLICY "Admins and territory managers can update dealer payments" ON public.dealer_payments
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'territory_sales_manager')
  );

CREATE POLICY "Admins and territory managers can delete dealer payments" ON public.dealer_payments
  FOR DELETE USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'territory_sales_manager')
  );

-- =====================================================
-- 5.20 SUPPLIER CREDITS POLICIES
-- =====================================================
CREATE POLICY "Admins can manage all supplier credits" ON public.supplier_credits
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Territory managers can view supplier credits" ON public.supplier_credits
  FOR SELECT USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'territory_sales_manager')
  );

CREATE POLICY "Territory managers can insert supplier credits" ON public.supplier_credits
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'territory_sales_manager')
  );

CREATE POLICY "Admins and territory managers can update supplier credits" ON public.supplier_credits
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'territory_sales_manager')
  );

CREATE POLICY "Admins and territory managers can delete supplier credits" ON public.supplier_credits
  FOR DELETE USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'territory_sales_manager')
  );

-- =====================================================
-- 5.21 SUPPLIER PAYMENTS POLICIES
-- =====================================================
CREATE POLICY "Admins can manage all supplier payments" ON public.supplier_payments
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Territory managers can view supplier payments" ON public.supplier_payments
  FOR SELECT USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'territory_sales_manager')
  );

CREATE POLICY "Territory managers can insert supplier payments" ON public.supplier_payments
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'territory_sales_manager')
  );

CREATE POLICY "Admins and territory managers can update supplier payments" ON public.supplier_payments
  FOR UPDATE USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'territory_sales_manager')
  );

CREATE POLICY "Admins and territory managers can delete supplier payments" ON public.supplier_payments
  FOR DELETE USING (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'territory_sales_manager')
  );

-- =====================================================
-- 5.22 EXPENSES POLICIES
-- =====================================================
CREATE POLICY "Admins can view all expenses" ON public.expenses
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own expenses" ON public.expenses
  FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Territory managers can view their territory expenses" ON public.expenses
  FOR SELECT USING (
    has_role(auth.uid(), 'territory_sales_manager') AND 
    territory = get_user_territory(auth.uid())
  );

CREATE POLICY "Admins and territory managers can create expenses" ON public.expenses
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'territory_sales_manager')
  );

CREATE POLICY "Users can update own expenses" ON public.expenses
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete own expenses" ON public.expenses
  FOR DELETE USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'));

-- =====================================================
-- 5.23 CASH TRANSACTIONS POLICIES
-- =====================================================
CREATE POLICY "Admins can manage all cash transactions" ON public.cash_transactions
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Territory managers can view cash transactions" ON public.cash_transactions
  FOR SELECT USING (has_role(auth.uid(), 'territory_sales_manager'));

CREATE POLICY "Territory managers can insert cash transactions" ON public.cash_transactions
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'territory_sales_manager')
  );

-- =====================================================
-- 5.24 AUDIT LOGS POLICIES
-- =====================================================
CREATE POLICY "Admins can view all audit logs" ON public.audit_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "No direct inserts to audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (false);

-- =====================================================
-- 5.25 BACKUP HISTORY POLICIES
-- =====================================================
CREATE POLICY "Admins can view backup history" ON public.backup_history
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "No direct user inserts to backup history" ON public.backup_history
  FOR INSERT WITH CHECK (false);

-- =====================================================
-- SECTION 6: CREATE FIRST ADMIN USER
-- =====================================================
-- After running this script, create a user via Supabase Auth UI
-- Then run this to make them admin (replace with actual user_id):
-- 
-- UPDATE public.user_roles 
-- SET role = 'admin' 
-- WHERE user_id = 'your-user-uuid-here';
--
-- Or insert directly:
-- INSERT INTO public.user_roles (user_id, role) 
-- VALUES ('your-user-uuid-here', 'admin');

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
