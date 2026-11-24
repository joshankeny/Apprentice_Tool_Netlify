"use server";

import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";

type Result = { kind: "success" | "error"; message: string } | null;

export async function manageUser(id: string, _previous: Result, form: FormData): Promise<Result> {
  const { supabase, userId } = await requireAdmin();
  if (!z.uuid().safeParse(id).success) return { kind: "error", message: "Select a valid user." };

  const intent = form.get("intent");
  if (intent === "promote") {
    if (id === userId) return { kind: "error", message: "Your account is already an admin." };

    const { data, error } = await supabase.from("profiles")
      .update({ role: "admin", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("role", "learner")
      .eq("active", true)
      .select("id")
      .maybeSingle();

    if (error) return { kind: "error", message: "The account could not be promoted. Refresh and try again." };
    if (!data) return { kind: "error", message: "Only active learners can be promoted. Refresh to see the current role." };
    revalidatePath("/admin/users");
    return { kind: "success", message: "Admin access granted. The user can refresh the app to see Admin." };
  }

  if (intent === "reset") {
    const { data: email, error } = await supabase.rpc("admin_training_reset_email", { p_user_id: id });
    if (error || !email) return { kind: "error", message: "This user needs an active account and an email address." };

    const origin = (await headers()).get("origin");
    if (!origin) return { kind: "error", message: "Open the Admin page in your browser and try again." };

    const mailer = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false, flowType: "implicit" } }
    );
    const { error: sendError } = await mailer.auth.resetPasswordForEmail(email, {
      redirectTo: new URL("/auth/reset-password", origin).href
    });
    return sendError
      ? { kind: "error", message: `Supabase could not request the reset email. ${sendError.message}` }
      : { kind: "success", message: `Password reset requested for ${email}.` };
  }

  const fields = z.object({
    display_name: z.string().trim().min(1).max(120),
    active: z.enum(["true", "false"])
  }).safeParse({
    display_name: form.get("display_name"),
    active: id === userId ? "true" : form.get("active")
  });
  if (intent !== "save" || !fields.success) {
    return { kind: "error", message: "Enter a display name and select an account status." };
  }

  const { data, error } = await supabase.from("profiles").update({
    display_name: fields.data.display_name,
    active: fields.data.active === "true"
  }).eq("id", id).select("id").maybeSingle();

  if (error || !data) return { kind: "error", message: "User changes could not be saved. Refresh and try again." };
  revalidatePath("/admin/users");
  return { kind: "success", message: "User changes saved." };
}

type TemporaryPasswordResult = { password: string } | { error: string };

export async function setTemporaryPassword(id: string): Promise<TemporaryPasswordResult> {
  const { supabase, userId } = await requireAdmin();
  if (!z.uuid().safeParse(id).success || id === userId) {
    return { error: "Select an active learner account." };
  }

  const { data: target, error: profileError } = await supabase.from("profiles")
    .select("id")
    .eq("id", id)
    .eq("role", "learner")
    .eq("active", true)
    .maybeSingle();

  if (profileError) return { error: "Could not confirm the learner account. Refresh and try again." };
  if (!target) return { error: "Temporary passwords are available for active learners only." };

  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!secretKey?.startsWith("sb_secret_")) {
    return { error: "Set the server-side SUPABASE_SECRET_KEY to enable temporary passwords." };
  }

  const authAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });

  const password = `Aa9!${randomBytes(18).toString("base64url")}`;
  const { data, error } = await authAdmin.auth.admin.updateUserById(target.id, { password });
  if (error || !data.user) {
    return { error: "Supabase could not confirm the password reset. Try again before sharing a password." };
  }

  return { password };
}
