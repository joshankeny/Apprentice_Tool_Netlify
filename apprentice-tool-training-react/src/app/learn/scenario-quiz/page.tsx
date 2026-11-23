import { requireUser } from "@/lib/auth";
import ChoiceQuizRunner from "@/components/training/ChoiceQuizRunner";

export default async function ScenarioQuizPage() {
  await requireUser();

  return (
    <div className="grid">
      <div>
        <h1>Scenario Quiz</h1>
        <div className="warning">
          Prototype application: Training content and data may be incomplete or inaccurate.
        </div>
        <p className="muted">
          Scenario-only questions. Wrong answers prefer tools from the same family, while other valid tools for the scenario are excluded from distractors.
        </p>
      </div>
      <ChoiceQuizRunner questionEndpoint="/api/scenario-quiz/question" />
    </div>
  );
}
