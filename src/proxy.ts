import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL, isConfigured } from "@/lib/supabase/config";

/**
 * Refreshes the Supabase session cookie for dashboard routes. This is NOT an authorization
 * boundary: every page, query and storage call is re-authorised server-side (RLS + is_owner()).
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!isConfigured()) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getClaims();
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export const config = { matcher: ["/studio/:path*", "/auth/:path*"] };
