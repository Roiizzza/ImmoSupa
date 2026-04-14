
-- Add SaaS tracking fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_vip boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS credits numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_3d_access boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS total_exposes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_online timestamp with time zone,
  ADD COLUMN IF NOT EXISTS total_paid numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_plan text NOT NULL DEFAULT 'Free';

-- Admins can view all profiles (for user management)
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update all profiles (for VIP/block/3D toggles)
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));
