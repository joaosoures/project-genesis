-- Allow admins to update any profile
CREATE POLICY "Admins can update all profiles" 
ON public.profiles 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Note: We already have "profiles_select" which is true for all.
-- We might want to restrict it later, but for now we focus on the fix.

-- Ensure that banned users cannot update their own profile anymore
-- (This overrides the existing profiles_update policy because multiple policies are ORed,
-- so we need to modify the existing one or add a restriction)

-- Instead of modifying, we can use a more restrictive approach for others
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "Users can update their own profile if not banned"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id AND is_banned = false)
WITH CHECK (auth.uid() = id AND is_banned = false);
