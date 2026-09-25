import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// per-request client that reads the signed-in user from the session cookies
export async function supabaseServer() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* called from a Server Component, where cookies are read-only; sign-in sets them instead */
        }
      },
    },
  });
}
