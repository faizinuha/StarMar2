
-- Create live_streams table
CREATE TABLE public.live_streams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Live Stream',
  description text,
  is_active boolean NOT NULL DEFAULT true,
  viewer_count integer NOT NULL DEFAULT 0,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;

-- Everyone can view active streams
CREATE POLICY "Anyone can view active streams" ON public.live_streams
  FOR SELECT USING (true);

-- Users can create their own streams
CREATE POLICY "Users can create own streams" ON public.live_streams
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own streams
CREATE POLICY "Users can update own streams" ON public.live_streams
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete their own streams
CREATE POLICY "Users can delete own streams" ON public.live_streams
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
