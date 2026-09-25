import "server-only";
import { createClient } from "@supabase/supabase-js";

// service-role client: bypasses Row Level Security, so it must only ever run on the server
export const supabaseAdmin = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
