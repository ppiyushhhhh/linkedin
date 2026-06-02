import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const PREF_COLS =
  "profile_visibility, show_email, show_location, allow_messages, allow_connection_requests, email_notifications, push_notifications";

export const getMyPreferences = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin
      .from("profiles" as any)
      .select(PREF_COLS)
      .eq("id", context.userId)
      .single();
    if (error) throw new Error(error.message);
    return data as {
      profile_visibility: "public" | "private";
      show_email: boolean;
      show_location: boolean;
      allow_messages: boolean;
      allow_connection_requests: boolean;
      email_notifications: boolean;
      push_notifications: boolean;
    };
  });

const prefsSchema = z.object({
  profile_visibility: z.enum(["public", "private"]).optional(),
  show_email: z.boolean().optional(),
  show_location: z.boolean().optional(),
  allow_messages: z.boolean().optional(),
  allow_connection_requests: z.boolean().optional(),
  email_notifications: z.boolean().optional(),
  push_notifications: z.boolean().optional(),
});

export const updateMyPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => prefsSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin
      .from("profiles" as any)
      .update(data)
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyAccountEmail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    if (error) throw new Error(error.message);
    return { email: data.user?.email ?? null, created_at: data.user?.created_at ?? null };
  });

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
