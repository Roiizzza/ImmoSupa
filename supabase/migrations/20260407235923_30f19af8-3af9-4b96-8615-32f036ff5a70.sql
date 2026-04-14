
-- Storage bucket for exposee images
INSERT INTO storage.buckets (id, name, public)
VALUES ('exposee-images', 'exposee-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can view exposee images"
ON storage.objects FOR SELECT
USING (bucket_id = 'exposee-images');

CREATE POLICY "Authenticated users can upload exposee images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'exposee-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own exposee images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'exposee-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own exposee images"
ON storage.objects FOR DELETE
USING (bucket_id = 'exposee-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Coupons table
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL,
  used_by UUID,
  used_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Admins can do everything with coupons
CREATE POLICY "Admins can manage all coupons"
ON public.coupons FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Any authenticated user can look up active unused coupons by code
CREATE POLICY "Users can view available coupons by code"
ON public.coupons FOR SELECT
TO authenticated
USING (is_active = true AND used_by IS NULL);

-- Users can claim a coupon (update used_by)
CREATE POLICY "Users can redeem coupons"
ON public.coupons FOR UPDATE
TO authenticated
USING (is_active = true AND used_by IS NULL)
WITH CHECK (used_by = auth.uid());
