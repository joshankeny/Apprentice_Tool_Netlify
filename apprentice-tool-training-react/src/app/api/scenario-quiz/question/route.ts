import { NextResponse } from "next/server";
import {
  authenticatedContext,
  chooseAdaptiveTool,
  cleanValue,
  createQuestionState,
  loadPublishedScenarios,
  loadPublishedTools,
  loadScenarioLinks,
  sameFamilyFirstTextDistractors,
  shuffle
} from "@/lib/training/server";

export async function GET() {
  try {
    const { userId } = await authenticatedContext();
    const [tools, scenarios, links] = await Promise.all([
      loadPublishedTools(false),
      loadPublishedScenarios(),
      loadScenarioLinks()
    ]);

    const toolIdsWithScenario = new Set(
      links.filter((link) => link.is_correct).map((link) => link.tool_id)
    );

    const remaining = tools.filter((tool) => toolIdsWithScenario.has(tool.id));

    while (remaining.length) {
      const selected = await chooseAdaptiveTool(remaining, userId);
      const tool = selected.tool;

      const scenarioIds = links
        .filter((link) => link.tool_id === tool.id && link.is_correct)
        .map((link) => link.scenario_id);

      const matchingScenarios = scenarios.filter((scenario) => scenarioIds.includes(scenario.id));

      if (matchingScenarios.length) {
        const scenario = shuffle(matchingScenarios)[0];
        const validToolIds = new Set(
          links
            .filter((link) => link.scenario_id === scenario.id && link.is_correct)
            .map((link) => link.tool_id)
        );

        const distractors = sameFamilyFirstTextDistractors({
          tools,
          correctTool: tool,
          getAnswer: (candidate) => cleanValue(candidate.formal_name),
          excludedToolIds: validToolIds
        });

        if (distractors.length === 3) {
          const correctAnswer = tool.formal_name;
          const options = shuffle([...distractors, correctAnswer]);
          const questionId = await createQuestionState({
            userId,
            mode: "SCENARIO_QUIZ",
            questionType: "scenario",
            correctToolId: tool.id,
            correctAnswer,
            optionValues: options,
            scenarioId: scenario.id
          });

          return NextResponse.json({
            question_id: questionId,
            prompt: "Which tool would be an appropriate choice for this scenario?",
            options,
            scenario_name: scenario.name,
            scenario_description: scenario.description,
            use_description: tool.use_description,
            learning_status: selected.status
          });
        }
      }

      const index = remaining.findIndex((candidate) => candidate.id === tool.id);
      if (index >= 0) remaining.splice(index, 1);
    }

    return NextResponse.json(
      { error: "No valid scenario question can currently be built." },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not build scenario question." },
      { status: 500 }
    );
  }
}
