"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";

type Result = { kind: "success" | "error"; message: string } | null;

export async function manageUser(id: string, _previous: Result, form: FormData): Promise<Result> {
  const { supabase, userId } = await requireAdmin();
  if (!z.uuid().safeParse(id).success) return { kind: "error", message: "Select a valid user." };

  if (form.get("intent") === "reset") {
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
  if (form.get("intent") !== "save" || !fields.success) {
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
