/**
 * Validates whether Supabase environment variables are configured.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return false;
  const trimmedUrl = url.trim();
  const trimmedKey = anonKey.trim();

  if (
    trimmedUrl === '' ||
    trimmedKey === '' ||
    trimmedUrl.includes('your-supabase-url') ||
    trimmedKey.includes('your-supabase-anon-key')
  ) {
    return false;
  }

  return true;
}
