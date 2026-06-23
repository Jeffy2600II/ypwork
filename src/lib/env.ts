// Path:    src/lib/env.ts
// Purpose: Centralized env var config — single source of truth.
//          ypwork shares the same Supabase project as yplabs.

export const CLIENT_SUPABASE_URL: string =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';

export const CLIENT_SUPABASE_ANON_KEY: string =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  '';

export const SERVER_SUPABASE_URL: string =
  process.env.SUPABASE_URL ??
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  '';

export const SUPABASE_SERVICE_ROLE_KEY: string =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export function isClientSupabaseConfigured(): boolean {
  return !!CLIENT_SUPABASE_URL && !!CLIENT_SUPABASE_ANON_KEY;
}

export function isServerSupabaseConfigured(): boolean {
  return !!SERVER_SUPABASE_URL && !!SUPABASE_SERVICE_ROLE_KEY;
}
