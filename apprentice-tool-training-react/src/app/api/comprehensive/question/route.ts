import { NextResponse } from "next/server";
import {
  authenticatedContext,
  chooseAdaptiveTool,
  cleanValue,
  createQuestionState,
  imageUrl,
  loadPublishedScenarios,
  loadPublishedTools,
  loadScenarioLinks,
  sameFamilyFirstAttributeDistractors,
  sameFamilyFirstTextDistractors,
  shuffle,
  type ToolRow
} from "@/lib/training/server";

type AttributeType = "formal_name" | "common_name" | "location" | "family_name";

const prompts: Record<AttributeType, string> = {
  formal_name: "What is the formal name of this tool?",
  common_name: "What is the common name of this tool?",
  location: "Where is this tool normally carried or stored?",
  family_name: "Which tool family does this tool belong to?"
};

function answerFor(tool: ToolRow, type: AttributeType) {
  if (type === "formal_name") return cleanValue(tool.formal_name);
  if (type === "common_name") return cleanValue(tool.common_name);
  if (type === "location") return cleanValue(tool.location);
  return cleanValue(tool.tool_families?.name);
}

export async function GET() {
  try {
    const { userId } = await authenticatedContext();
    const [tools, scenarios, links] = await Promise.all([
      loadPublishedTools(true),
      loadPublishedScenarios(),
      loadScenarioLinks()
    ]);

    const toolsWithImages = tools.filter((tool) => Boolean(tool.image_path));
    if (!toolsWithImages.length) {
      return NextResponse.json({ error: "No published tools with images are available." }, { status: 400 });
    }

    // Try adaptively selected tools until one can produce at least one valid question type.
    const remaining = [...toolsWithImages];

    while (remaining.length) {
      const selected = await chooseAdaptiveTool(remaining, userId);
      const tool = selected.tool;
      const candidates: Array<{
        type: AttributeType | "scenario";
        correctAnswer: string;
        options: string[];
        scenario?: { id: string; name: string; description: string };
      }> = [];

      for (const type of ["formal_name", "common_name", "location", "family_name"] as AttributeType[]) {
        const correctAnswer = answerFor(tool, type);
        if (!correctAnswer) continue;

        const distractors = type === "formal_name" || type === "common_name"
          ? sameFamilyFirstTextDistractors({
              tools,
              correctTool: tool,
              getAnswer: (candidate) => answerFor(candidate, type)
            })
          : sameFamilyFirstAttributeDistractors({
              tools,
              correctTool: tool,
              getAnswer: (candidate) => answerFor(candidate, type)
            });

        if (distractors.length === 3) {
          candidates.push({
            type,
            correctAnswer,
            options: shuffle([...distractors, correctAnswer])
          });
        }
      }

      const correctScenarioIds = links
        .filter((link) => link.tool_id === tool.id && link.is_correct)
        .map((link) => link.scenario_id);

      const matchingScenarios = scenarios.filter((scenario) => correctScenarioIds.includes(scenario.id));

      if (matchingScenarios.length) {
        const scenario = shuffle(matchingScenarios)[0];
        const allCorrectToolIds = new Set(
          links
            .filter((link) => link.scenario_id === scenario.id && link.is_correct)
            .map((link) => link.tool_id)
        );

        const distractors = sameFamilyFirstTextDistractors({
          tools,
          correctTool: tool,
          getAnswer: (candidate) => cleanValue(candidate.formal_name),
          excludedToolIds: allCorrectToolIds
        });

        if (distractors.length === 3) {
          candidates.push({
            type: "scenario",
            correctAnswer: tool.formal_name,
            options: shuffle([...distractors, tool.formal_name]),
            scenario: {
              id: scenario.id,
              name: scenario.name,
              description: scenario.description
            }
          });
        }
      }

      if (candidates.length) {
        const candidate = shuffle(candidates)[0];
        const questionId = await createQuestionState({
          userId,
          mode: "QUIZ",
          questionType: candidate.type,
          correctToolId: tool.id,
          correctAnswer: candidate.correctAnswer,
          optionValues: candidate.options,
          scenarioId: candidate.scenario?.id ?? null
        });

        return NextResponse.json({
          question_id: questionId,
          question_type: candidate.type,
          prompt:
            candidate.type === "scenario"
              ? "Which tool would be an appropriate choice for this scenario?"
              : prompts[candidate.type],
          options: candidate.options,
          image_url: candidate.type === "scenario" ? null : imageUrl(tool.image_path),
          scenario_name: candidate.scenario?.name ?? null,
          scenario_description: candidate.scenario?.description ?? null,
          use_description: tool.use_description,
          learning_status: selected.status
        });
      }

      const index = remaining.findIndex((candidate) => candidate.id === tool.id);
      if (index >= 0) remaining.splice(index, 1);
    }

    return NextResponse.json(
      { error: "No tools currently have enough distinct data to build a comprehensive question." },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not build question." },
      { status: 500 }
    );
  }
}
