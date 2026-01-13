-- Add ON DELETE CASCADE to profiles table foreign key
-- First, drop the existing constraint if any, then add with CASCADE
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles 
  ADD CONSTRAINT profiles_id_fkey 
  FOREIGN KEY (id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Add ON DELETE CASCADE to user_roles table foreign key
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE public.user_roles 
  ADD CONSTRAINT user_roles_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Also add CASCADE to other tables that reference user IDs
-- dealers.user_id (if it references auth.users)
ALTER TABLE public.dealers DROP CONSTRAINT IF EXISTS dealers_user_id_fkey;
ALTER TABLE public.dealers 
  ADD CONSTRAINT dealers_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL;