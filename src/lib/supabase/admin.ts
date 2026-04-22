import { createClient } from '@supabase/supabase-js';

// Admin client with service role key — ONLY use in server-side code (server actions, server components).
// Never expose to the client. Never import from client components.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
