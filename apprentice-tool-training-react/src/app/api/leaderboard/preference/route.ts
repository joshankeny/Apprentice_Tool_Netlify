import { NextResponse } from "next/server";
import { authenticatedContext } from "@/lib/training/server";

export async function POST(request: Request) {
  try {
    const { supabase, userId } = await authenticatedContext();
    const body = await request.json();

    if (typeof body?.leaderboardOptIn !== "boolean") {
      return NextResponse.json(
        { error: "leaderboardOptIn must be true or false." },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("profiles")
      .update({ leaderboard_opt_in: body.leaderboardOptIn })
      .eq("id", userId);

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save preference.";
    const status = message === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
