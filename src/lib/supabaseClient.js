import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const isConfigured = Boolean(url && key);
// A public preview must render without production credentials. Network calls are
// prevented by callers when configuration is missing; these are inert placeholders.
export const supabase = createClient(
  url || "https://unconfigured.invalid",
  key || "unconfigured",
  {
    auth: {
      persistSession: isConfigured,
      autoRefreshToken: isConfigured,
      detectSessionInUrl: isConfigured,
    },
  },
);
