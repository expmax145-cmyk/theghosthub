-- Trigger functions never need to be callable through the REST API.
-- (public.is_owner() stays executable on purpose: RLS policies call it, and it only reports on the caller.)
revoke execute on function public.check_file_project() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.log_activity() from public, anon, authenticated;
