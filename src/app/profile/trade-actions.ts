"use server";

import { requireUser } from "@/lib/auth";
import { isTrade } from "@/lib/trades";

type TradeResult = { message: string; error: boolean } | null;

export async function saveTradePreferences(_previous: TradeResult, form: FormData): Promise<TradeResult> {
  const { supabase, userId } = await requireUser();
  const trade = form.get("trade");
  if (!isTrade(trade)) return { message: "Select a valid trade.", error: true };

  const { data, error } = await supabase.from("profiles").update({
    trade,
    trade_only: trade !== "general" && form.get("tradeOnly") === "on"
  }).eq("id", userId).select("id").maybeSingle();

  return error || !data
    ? { message: "Training preferences could not be saved. Try again.", error: true }
    : { message: "Training preferences saved.", error: false };
}
