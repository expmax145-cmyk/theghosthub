export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
export const BUCKET = "hub-files";

export function isConfigured(): boolean {
  return /^https?:\/\//.test(SUPABASE_URL) && SUPABASE_KEY.length > 10;
}
