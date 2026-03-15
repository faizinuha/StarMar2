
-- Moderator applications table
CREATE TABLE public.moderator_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_response text,
  responded_by uuid,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.moderator_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own applications" ON public.moderator_applications
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own applications" ON public.moderator_applications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all applications" ON public.moderator_applications
FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Admins can update applications" ON public.moderator_applications
FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

CREATE POLICY "Admins can delete applications" ON public.moderator_applications
FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

-- User warnings/mutes table
CREATE TABLE public.user_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  warned_by uuid NOT NULL,
  type text NOT NULL DEFAULT 'warning', -- 'warning' or 'mute'
  reason text NOT NULL,
  mute_until timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_warnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and moderators can create warnings" ON public.user_warnings
FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin', 'moderator'))
);

CREATE POLICY "Admins and moderators can view warnings" ON public.user_warnings
FOR SELECT USING (
  auth.uid() = user_id OR
  EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin', 'moderator'))
);

CREATE POLICY "Admins and moderators can update warnings" ON public.user_warnings
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin', 'moderator'))
);

CREATE POLICY "Admins can delete warnings" ON public.user_warnings
FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin')
);

-- Allow moderators to view/update reports
CREATE POLICY "Moderators can view all reports" ON public.reports
FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'moderator'));

CREATE POLICY "Moderators can update reports" ON public.reports
FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'moderator'));

CREATE POLICY "Moderators can delete reports" ON public.reports
FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'moderator'));

-- Allow moderators to view/update verification requests
CREATE POLICY "Moderators can view verification requests" ON public.verification_requests
FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'moderator'));

CREATE POLICY "Moderators can update verification requests" ON public.verification_requests
FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'moderator'));

-- Allow moderators to view profiles (already public, but for completeness)
-- Allow moderators to delete comments
CREATE POLICY "Moderators can delete comments" ON public.comments
FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin', 'moderator')));

-- Allow moderators to delete posts (for content moderation)
CREATE POLICY "Moderators can delete posts" ON public.posts
FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin', 'moderator')));

-- Allow admin to delete posts too
CREATE POLICY "Admins can delete any post" ON public.posts
FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));
