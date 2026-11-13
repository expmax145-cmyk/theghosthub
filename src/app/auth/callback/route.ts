import { NextResponse, type NextRequest } from "next/server";
import { createUserClient } from "@/lib/supabase/server";
import { isConfigured } from "@/lib/supabase/config";

/** Completes the password-recovery link: exchanges the code, then opens the dashboard. */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const dest = new URL("/studio", url.origin);
  if (isConfigured() && code) {
    const supabase = await createUserClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) dest.searchParams.set("error", "link");
    else dest.searchParams.set("reset", "1");
  } else {
    dest.searchParams.set("error", "link");
  }
  return NextResponse.redirect(dest);
}
