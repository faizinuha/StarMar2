-- Add image_url column to comments table for image/GIF support
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS image_url text;

-- Create ban_appeals table for storing user appeals
CREATE TABLE IF NOT EXISTS public.ban_appeals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  explanation text NOT NULL,
  evidence text,
  contact_email text,
  status text NOT NULL DEFAULT 'pending',
  admin_response text,
  responded_by uuid,
  responded_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ban_appeals ENABLE ROW LEVEL SECURITY;

-- Policies for ban_appeals
CREATE POLICY "Users can create their own appeals"
ON public.ban_appeals FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own appeals"
ON public.ban_appeals FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all appeals"
ON public.ban_appeals FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
));

CREATE POLICY "Admins can update appeals"
ON public.ban_appeals FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'
));

-- Add trigger for updated_at
CREATE TRIGGER update_ban_appeals_updated_at
  BEFORE UPDATE ON public.ban_appeals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();