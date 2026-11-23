import { requireUser } from "@/lib/auth";
import FlashcardRunner from "@/components/training/FlashcardRunner";

export default async function FlashcardsPage() {
  await requireUser();

  return (
    <div className="grid">
      <div>
        <h1>Flashcards</h1>
        <div className="warning">
          Prototype application: Training content and data may be incomplete or inaccurate.
        </div>
        <p className="muted">Look at the image first. Reveal the answer when you're ready.</p>
      </div>
      <FlashcardRunner />
    </div>
  );
}
