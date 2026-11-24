import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

const sections = [
  { href: "/admin/tools", title: "Tools", details: "Edit the tool catalog and upload photos." },
  { href: "/admin/scenarios", title: "Scenarios", details: "Write use cases and choose which tools count as correct answers." },
  { href: "/admin/users", title: "Users", details: "Update display names, manage access, and reset passwords." },
  { href: "/admin/learner-progress", title: "Learner Progress", details: "Review recent attempts, tool mastery, and quiz performance." }
];

export default async function AdminPage() {
  await requireAdmin();

  return (
    <div className="grid">
      <h1>Admin</h1>
      <div className="grid grid-2">
        {sections.map(({ href, title, details }) => (
          <section className="card training-mode" key={href}>
            <h2>{title}</h2>
            <p className="muted">{details}</p>
            <Link className="button" href={href}>{title === "Learner Progress" ? "View Learner Progress" : `Manage ${title}`}</Link>
          </section>
        ))}
      </div>
    </div>
  );
}
