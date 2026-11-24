import { NextResponse } from "next/server";
import { sampleWithoutReplacement } from "@/lib/training/random";
import {
  authenticatedContext,
  chooseAdaptiveTool,
  createQuestionState,
  imageUrl,
  loadPublishedTools,
  type ToolRow
} from "@/lib/training/server";

export async function GET() {
  try {
    const { userId } = await authenticatedContext();
    const tools = await loadPublishedTools(true);
    const byFamily = new Map<string, ToolRow[]>();

    for (const tool of tools) {
      if (!tool.family_id) continue;
      const family = byFamily.get(tool.family_id) ?? [];
      family.push(tool);
      byFamily.set(tool.family_id, family);
    }

    const eligible = [...byFamily.values()].filter((family) => family.length >= 4).flat();
    if (!eligible.length) {
      return NextResponse.json({
        error: "Tool Family Quiz needs four eligible published tools with photos in one family. Check the catalog or your trade filter in Profile."
      }, { status: 400 });
    }

    const { tool: correct } = await chooseAdaptiveTool(eligible, userId);
    const family = byFamily.get(correct.family_id!)!;
    const distractors = sampleWithoutReplacement(family.filter((tool) => tool.id !== correct.id), 3);
    const options = sampleWithoutReplacement([correct, ...distractors], 4);
    const questionId = await createQuestionState({
      userId,
      mode: "FAMILY_QUIZ",
      questionType: "family_image",
      correctToolId: correct.id,
      optionToolIds: options.map((tool) => tool.id)
    });

    return NextResponse.json({
      question_id: questionId,
      prompt: `Select the ${correct.formal_name}`,
      family_name: correct.tool_families?.name ?? "Tool Family",
      options: options.map((tool) => ({
        tool_id: tool.id,
        formal_name: tool.formal_name,
        image_url: imageUrl(tool.image_path)
      }))
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Could not create a Tool Family Quiz question." }, { status: 500 });
  }
}
