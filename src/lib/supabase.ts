import { createClient } from "@supabase/supabase-js";

const fallbackSupabaseUrl = "https://mkiqutduxroxxskzbfsk.supabase.co";
const fallbackPublishableKey = "sb_publishable_jHItN-mxpsI0FROYzdVxBA_81zSyyBW";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || fallbackSupabaseUrl;
const supabasePublishableKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) || fallbackPublishableKey;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabasePublishableKey);

export const supabase = hasSupabaseConfig ? createClient(supabaseUrl!, supabasePublishableKey!) : null;
