
import { createClient } from './server';
import { NextRequest } from 'next/server';

export async function getSupabaseSession(request: NextRequest) {
  const supabase = createClient(request.cookies);
  const { data: { user } } = await supabase.auth.getUser();
  return { user };
}
