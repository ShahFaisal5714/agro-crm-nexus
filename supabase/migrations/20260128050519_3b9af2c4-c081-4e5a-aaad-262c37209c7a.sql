
-- Add ON DELETE SET NULL to all created_by foreign key columns
-- This allows user deletion while preserving the business data

-- First, drop existing foreign key constraints if they exist, then recreate with SET NULL
-- We need to handle this carefully to avoid data loss

-- dealer_credits.created_by
ALTER TABLE public.dealer_credits 
DROP CONSTRAINT IF EXISTS dealer_credits_created_by_fkey;

ALTER TABLE public.dealer_credits 
ADD CONSTRAINT dealer_credits_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Make created_by nullable if not already
ALTER TABLE public.dealer_credits ALTER COLUMN created_by DROP NOT NULL;

-- dealer_payments.created_by
ALTER TABLE public.dealer_payments 
DROP CONSTRAINT IF EXISTS dealer_payments_created_by_fkey;

ALTER TABLE public.dealer_payments 
ADD CONSTRAINT dealer_payments_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.dealer_payments ALTER COLUMN created_by DROP NOT NULL;

-- expenses.created_by
ALTER TABLE public.expenses 
DROP CONSTRAINT IF EXISTS expenses_created_by_fkey;

ALTER TABLE public.expenses 
ADD CONSTRAINT expenses_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.expenses ALTER COLUMN created_by DROP NOT NULL;

-- invoices.created_by
ALTER TABLE public.invoices 
DROP CONSTRAINT IF EXISTS invoices_created_by_fkey;

ALTER TABLE public.invoices 
ADD CONSTRAINT invoices_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.invoices ALTER COLUMN created_by DROP NOT NULL;

-- invoice_payments.created_by
ALTER TABLE public.invoice_payments 
DROP CONSTRAINT IF EXISTS invoice_payments_created_by_fkey;

ALTER TABLE public.invoice_payments 
ADD CONSTRAINT invoice_payments_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.invoice_payments ALTER COLUMN created_by DROP NOT NULL;

-- sales_orders.created_by
ALTER TABLE public.sales_orders 
DROP CONSTRAINT IF EXISTS sales_orders_created_by_fkey;

ALTER TABLE public.sales_orders 
ADD CONSTRAINT sales_orders_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.sales_orders ALTER COLUMN created_by DROP NOT NULL;

-- purchases.created_by
ALTER TABLE public.purchases 
DROP CONSTRAINT IF EXISTS purchases_created_by_fkey;

ALTER TABLE public.purchases 
ADD CONSTRAINT purchases_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.purchases ALTER COLUMN created_by DROP NOT NULL;

-- policies.created_by
ALTER TABLE public.policies 
DROP CONSTRAINT IF EXISTS policies_created_by_fkey;

ALTER TABLE public.policies 
ADD CONSTRAINT policies_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.policies ALTER COLUMN created_by DROP NOT NULL;

-- policy_payments.created_by
ALTER TABLE public.policy_payments 
DROP CONSTRAINT IF EXISTS policy_payments_created_by_fkey;

ALTER TABLE public.policy_payments 
ADD CONSTRAINT policy_payments_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.policy_payments ALTER COLUMN created_by DROP NOT NULL;

-- supplier_credits.created_by
ALTER TABLE public.supplier_credits 
DROP CONSTRAINT IF EXISTS supplier_credits_created_by_fkey;

ALTER TABLE public.supplier_credits 
ADD CONSTRAINT supplier_credits_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.supplier_credits ALTER COLUMN created_by DROP NOT NULL;

-- supplier_payments.created_by
ALTER TABLE public.supplier_payments 
DROP CONSTRAINT IF EXISTS supplier_payments_created_by_fkey;

ALTER TABLE public.supplier_payments 
ADD CONSTRAINT supplier_payments_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.supplier_payments ALTER COLUMN created_by DROP NOT NULL;

-- cash_transactions.created_by
ALTER TABLE public.cash_transactions 
DROP CONSTRAINT IF EXISTS cash_transactions_created_by_fkey;

ALTER TABLE public.cash_transactions 
ADD CONSTRAINT cash_transactions_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.cash_transactions ALTER COLUMN created_by DROP NOT NULL;

-- audit_logs.user_id - keep records but allow deletion
ALTER TABLE public.audit_logs 
DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

ALTER TABLE public.audit_logs 
ADD CONSTRAINT audit_logs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.audit_logs ALTER COLUMN user_id DROP NOT NULL;

-- backup_history.triggered_by - already nullable
ALTER TABLE public.backup_history 
DROP CONSTRAINT IF EXISTS backup_history_triggered_by_fkey;

ALTER TABLE public.backup_history 
ADD CONSTRAINT backup_history_triggered_by_fkey 
FOREIGN KEY (triggered_by) REFERENCES auth.users(id) ON DELETE SET NULL;
