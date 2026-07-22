import { createClient } from "npm:@supabase/supabase-js@2.49.8";
import { requiredEnv } from "./http.ts";

export function adminClient() {
  return createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function authenticatedClient(accessToken: string) {
  return createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_ANON_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
