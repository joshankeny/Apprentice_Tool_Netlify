import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticatedContext } from "@/lib/training/server";

const Payload = z.object({
  question_id: z.string().uuid(),
  rating: z.enum(["KNOWN", "REVIEW"])
});

export async function POST(request: NextRequest) {
  try {
    const { supabase, userId } = await authenticatedContext();
    const parsed = Payload.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const { question_id, rating } = parsed.data;
    const { data: question, error } = await supabase
      .from("quiz_questions")
      .select("id, correct_tool_id, answered_at, expires_at")
      .eq("id", question_id)
      .eq("user_id", userId)
      .eq("mode", "FLASHCARD")
      .single();

    if (error || !question) {
      return NextResponse.json({ error: "Flashcard not found." }, { status: 404 });
    }

    if (question.answered_at) {
      return NextResponse.json({ error: "Flashcard already rated." }, { status: 409 });
    }

    if (new Date(question.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "Flashcard expired." }, { status: 410 });
    }

    const isCorrect = rating === "KNOWN";

    const { error: attemptError } = await supabase.from("attempts").insert({
      user_id: userId,
      mode: "FLASHCARD",
      tool_id: question.correct_tool_id,
      question_type: "SELF_RATING",
      selected_answer: rating,
      correct_answer: "KNOWN",
      is_correct: isCorrect
    });

    if (attemptError) throw attemptError;

    await supabase
      .from("quiz_questions")
      .update({ answered_at: new Date().toISOString() })
      .eq("id", question_id)
      .eq("user_id", userId);

    return NextResponse.json({ saved: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save rating." },
      { status: 500 }
    );
  }
}
