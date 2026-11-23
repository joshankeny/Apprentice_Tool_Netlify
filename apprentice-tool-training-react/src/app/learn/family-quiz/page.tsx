import { requireUser } from "@/lib/auth";
import FamilyQuiz from "./quiz-client";
export default async function FamilyQuizPage(){await requireUser();return <div><h1>Tool Family Quiz</h1><div className="warning">Prototype application: Training content and data may be incomplete or inaccurate.</div><p className="muted">Identify the named tool from four photos in the same tool family.</p><FamilyQuiz/></div>}
