import { createClient } from '@supabase/supabase-js';

let cachedClient = null;

export function getSupabaseServer() {
  if (cachedClient) return cachedClient;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) return null;

  cachedClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return cachedClient;
}
