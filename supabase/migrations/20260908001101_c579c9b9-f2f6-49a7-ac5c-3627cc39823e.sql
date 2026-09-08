DROP FUNCTION IF EXISTS public.tmp_import_exec(text);

CREATE TRIGGER trg_sync_data_congelamento BEFORE INSERT OR UPDATE ON public.assinaturas FOR EACH ROW EXECUTE FUNCTION public.sync_data_congelamento();
CREATE TRIGGER tr_check_ia_limit BEFORE INSERT ON public.geracoes_ia FOR EACH ROW EXECUTE FUNCTION public.check_ia_limit();
CREATE TRIGGER trg_set_referral_code BEFORE INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_referral_code();
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
CREATE TRIGGER on_auth_user_created_settings AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_settings();