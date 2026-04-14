-- Support multi-use coupons with usage tracking
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS max_uses integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS use_count integer NOT NULL DEFAULT 0;

-- Backfill existing rows from legacy single-use fields
UPDATE public.coupons
SET use_count = CASE WHEN used_by IS NOT NULL THEN 1 ELSE 0 END
WHERE use_count = 0;

-- Track every redemption event
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  used_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, user_id)
);

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- Coupon lookup for active, still-usable coupons
DROP POLICY IF EXISTS "Users can view available coupons by code" ON public.coupons;
CREATE POLICY "Users can view available coupons by code"
ON public.coupons FOR SELECT
TO authenticated
USING (
  is_active = true
  AND (expires_at IS NULL OR expires_at > now())
  AND use_count < max_uses
);

-- Redemption history policies
DROP POLICY IF EXISTS "Users can insert own coupon redemptions" ON public.coupon_redemptions;
CREATE POLICY "Users can insert own coupon redemptions"
ON public.coupon_redemptions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own coupon redemptions" ON public.coupon_redemptions;
CREATE POLICY "Users can view own coupon redemptions"
ON public.coupon_redemptions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all coupon redemptions" ON public.coupon_redemptions;
CREATE POLICY "Admins can manage all coupon redemptions"
ON public.coupon_redemptions FOR ALL
USING (public.has_role(auth.uid(), 'admin'));
