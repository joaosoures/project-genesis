import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// O projeto agora utiliza a infraestrutura nativa da Lovable Cloud.
// As chaves são gerenciadas internamente e não requerem variáveis de ambiente externas.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});