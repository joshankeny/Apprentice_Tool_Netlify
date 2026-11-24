import { NextResponse } from "next/server";
import {
  authenticatedContext,
  chooseAdaptiveTool,
  createQuestionState,
  imageUrl,
  loadPublishedTools
} from "@/lib/training/server";

export async function GET() {
  try {
    const { userId } = await authenticatedContext();
    const tools = await loadPublishedTools(true);

    const eligible = tools.filter((tool) => Boolean(tool.image_path));
    const selected = await chooseAdaptiveTool(eligible, userId);
    const tool = selected.tool;

    const questionId = await createQuestionState({
      userId,
      mode: "FLASHCARD",
      questionType: "SELF_RATING",
      correctToolId: tool.id,
      correctAnswer: "KNOWN",
      optionValues: ["REVIEW", "KNOWN"]
    });

    return NextResponse.json({
      question_id: questionId,
      tool: {
        tool_id: tool.id,
        formal_name: tool.formal_name,
        common_name: tool.common_name,
        use_description: tool.use_description,
        location: tool.location,
        family_name: tool.tool_families?.name ?? "Uncategorized",
        image_url: imageUrl(tool.image_path),
        learning_status: selected.status
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load flashcard." },
      { status: 500 }
    );
  }
}
