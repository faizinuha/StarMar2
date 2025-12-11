-- Fix maintenance_mode RLS policy to check profiles.role instead of user_roles
DROP POLICY IF EXISTS "Admins can manage maintenance" ON maintenance_mode;

-- Create proper admin check policies for maintenance_mode
CREATE POLICY "Admins can insert maintenance" 
ON maintenance_mode 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can update maintenance" 
ON maintenance_mode 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can delete maintenance" 
ON maintenance_mode 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Fix profiles table - admins should be able to update other users for ban actions
CREATE POLICY "Admins can update any profile for ban" 
ON profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND p.role = 'admin'
  )
);