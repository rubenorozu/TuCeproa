
import { createClient } from './server';

export async function getSupabaseSession() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { user };
}
