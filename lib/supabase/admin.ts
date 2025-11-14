import { createClient } from '@supabase/supabase-js';

// Este cliente utiliza la SERVICE_ROLE_KEY para saltarse las políticas de RLS.
// NUNCA debe ser expuesto o utilizado en el frontend. Su uso es exclusivamente en el backend (API routes, server components).
export const createAdminClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Missing Supabase URL or Service Role Key for admin client');
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
