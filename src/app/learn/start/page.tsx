import Link from "next/link";
import { requireUser } from "@/lib/auth";

const modes = [
  {
    name: "Flashcards",
    href: "/learn/flashcards",
    description: "Study tool photos, then reveal the name, use, location, and family."
  },
  {
    name: "Comprehensive Quiz",
    href: "/learn/quiz",
    description: "Answer mixed questions about tool names, locations, families, and scenarios."
  },
  {
    name: "Tool Family Quiz",
    href: "/learn/family-quiz",
    description: "Identify the named tool from four photos in the same family."
  },
  {
    name: "Scenario Quiz",
    href: "/learn/scenario-quiz",
    description: "Choose an appropriate tool for a practical training scenario."
  }
];

export default async function StartTrainingPage() {
  await requireUser();

  return (
    <div className="grid">
      <h1>Start Training</h1>
      <div className="warning">
        Prototype application. Training content may be incomplete or inaccurate.
        Follow approved procedures and safety guidance for work in the field.
      </div>
      <div className="grid grid-2">
        {modes.map(({ name, href, description }) => (
          <section className="card training-mode" key={href}>
            <div>
              <h2>{name}</h2>
              <p className="muted">{description}</p>
            </div>
            <Link className="button" href={href}>Start {name}</Link>
          </section>
        ))}
      </div>
    </div>
  );
}
