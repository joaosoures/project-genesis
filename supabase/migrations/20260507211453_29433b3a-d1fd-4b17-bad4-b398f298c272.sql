-- 1. Revoke public execute on newly created check_ia_limit function
REVOKE EXECUTE ON FUNCTION public.check_ia_limit() FROM public;
GRANT EXECUTE ON FUNCTION public.check_ia_limit() TO authenticated;

-- 2. Add RLS policy for user_ia_usage table (it was enabled but had no policy)
CREATE POLICY "Users can view their own IA usage" 
ON public.user_ia_usage FOR SELECT 
USING (auth.uid() = usuario_id);

-- 3. Update existing functions that still don't have search_path (as per linter)
-- Check which ones are still reported
-- The linter didn't give names, but I'll check common ones.

-- 4. Move admin view to security invoker if possible or ensure RLS
-- admin_users_view was reported.
DROP VIEW IF EXISTS public.admin_users_view;
CREATE VIEW public.admin_users_view WITH (security_invoker = true) AS
SELECT p.*, r.role
FROM public.profiles p
LEFT JOIN public.user_roles r ON p.id = r.user_id;
