import { requireUser } from "@/lib/auth";
import ChoiceQuizRunner from "@/components/training/ChoiceQuizRunner";

export default async function ComprehensiveQuizPage() {
  await requireUser();

  return (
    <div className="grid">
      <div>
        <h1>Comprehensive Quiz</h1>
        <div className="warning">
          Prototype application: Training content and data may be incomplete or inaccurate.
        </div>
        <p className="muted">
          Mixed questions covering formal names, common names, locations, families, and scenarios.
          Distractors prefer the same tool family when possible.
        </p>
      </div>
      <ChoiceQuizRunner questionEndpoint="/api/comprehensive/question" />
    </div>
  );
}
