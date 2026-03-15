
-- Allow admin to delete reports
CREATE POLICY "Admins can delete reports"
ON public.reports
FOR DELETE
TO public
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

-- Allow admin to delete ban_appeals
CREATE POLICY "Admins can delete appeals"
ON public.ban_appeals
FOR DELETE
TO public
USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'admin'));

-- Allow users to delete own live_streams
CREATE POLICY "Users can delete own streams"
ON public.live_streams
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
