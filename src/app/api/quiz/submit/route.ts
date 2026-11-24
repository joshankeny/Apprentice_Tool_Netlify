import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authenticatedContext } from "@/lib/training/server";

const Payload = z.object({
  question_id: z.string().uuid(),
  selected_answer: z.string().min(1)
});

export async function POST(request: NextRequest) {
  try {
    const { supabase, userId } = await authenticatedContext();
    const parsed = Payload.safeParse(await request.json());

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const { question_id, selected_answer } = parsed.data;

    const { data: question, error } = await supabase
      .from("quiz_questions")
      .select(
        "id, mode, question_type, correct_tool_id, correct_answer, option_values, answered_at, expires_at"
      )
      .eq("id", question_id)
      .eq("user_id", userId)
      .single();

    if (error || !question) {
      return NextResponse.json({ error: "Question not found." }, { status: 404 });
    }

    if (question.answered_at) {
      return NextResponse.json({ error: "Question has already been answered." }, { status: 409 });
    }

    if (new Date(question.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "Question expired." }, { status: 410 });
    }

    const options = (question.option_values ?? []) as string[];
    if (!options.includes(selected_answer)) {
      return NextResponse.json({ error: "Invalid answer option." }, { status: 400 });
    }

    const correctAnswer = String(question.correct_answer ?? "");
    const isCorrect = selected_answer === correctAnswer;

    const { error: attemptError } = await supabase.from("attempts").insert({
      user_id: userId,
      mode: question.mode === "SCENARIO_QUIZ" ? "QUIZ" : question.mode,
      tool_id: question.correct_tool_id,
      question_type: question.question_type,
      selected_answer,
      correct_answer: correctAnswer,
      is_correct: isCorrect
    });

    if (attemptError) throw attemptError;

    await supabase
      .from("quiz_questions")
      .update({ answered_at: new Date().toISOString() })
      .eq("id", question_id)
      .eq("user_id", userId);

    return NextResponse.json({
      correct: isCorrect,
      correct_answer: correctAnswer
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not submit answer." },
      { status: 500 }
    );
  }
}
