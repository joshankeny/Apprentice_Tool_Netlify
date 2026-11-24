import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const getUserContext = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) return null;
  return { supabase, userId };
});

export const getUserProfile = cache(async () => {
  const context = await getUserContext();
  if (!context) return null;

  const { data } = await context.supabase
    .from("profiles")
    .select("display_name, role, active, leaderboard_opt_in")
    .eq("id", context.userId)
    .single();

  return data;
});

export async function requireUser() {
  const context = await getUserContext();
  if (!context) redirect("/login");
  return context;
}

export async function requireAdmin() {
  const context = await requireUser();
  const profile = await getUserProfile();
  if (profile?.role !== "admin" || !profile.active) redirect("/learn");
  return context;
}
