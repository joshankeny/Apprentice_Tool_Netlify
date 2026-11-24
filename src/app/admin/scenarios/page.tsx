import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { ScenarioForm } from "./scenario-form";

export default async function ScenariosPage({
  searchParams
}: {
  searchParams: Promise<{ edit?: string; saved?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const { edit, saved } = await searchParams;
  const scenarios = supabase.from("scenarios")
    .select("id,name,description,status,updated_at,scenario_tools(tool_id,is_correct)");

  if (edit) {
    if (edit !== "new" && !z.uuid().safeParse(edit).success) notFound();
    const [{ data: scenario, error: scenarioError }, { data: tools, error: toolsError }] = await Promise.all([
      edit === "new" ? Promise.resolve({ data: null, error: null }) : scenarios.eq("id", edit).maybeSingle(),
      supabase.from("tools").select("id,formal_name,status").order("formal_name").order("id")
    ]);
    if (scenarioError || toolsError) return <p className="warning">The scenario editor could not be loaded. Refresh to try again.</p>;
    if (!scenario && edit !== "new") notFound();

    return (
      <div className="grid">
        <Link className="admin-back" href="/admin/scenarios">Back to Scenarios</Link>
        <h1>{scenario ? "Edit Scenario" : "Add Scenario"}</h1>
        <ScenarioForm key={edit} scenario={scenario ?? undefined} tools={tools ?? []} />
      </div>
    );
  }

  const { data, error } = await scenarios.order("name").order("id");
  return (
    <div className="grid">
      <div className="admin-heading">
        <div>
          <Link className="admin-back" href="/admin">Back to Admin</Link>
          <h1>Scenarios</h1>
        </div>
        <Link className="button" href="/admin/scenarios?edit=new">Add Scenario</Link>
      </div>
      {saved === "1" && <p className="admin-save-status" role="status">Scenario saved.</p>}
      {error ? <p className="warning" role="alert">Scenarios could not be loaded. Refresh to try again.</p> :
        data?.length ? (
          <div className="card admin-table-wrap">
            <table className="table admin-tool-table">
              <thead><tr><th scope="col">Scenario</th><th scope="col">Use case</th><th scope="col">Status</th><th scope="col">Correct tools</th><th scope="col">Actions</th></tr></thead>
              <tbody>
                {data.map((scenario) => (
                  <tr key={scenario.id}>
                    <th scope="row">{scenario.name}</th>
                    <td>{scenario.description}</td>
                    <td className="admin-status">{scenario.status}</td>
                    <td>{scenario.scenario_tools.filter((link) => link.is_correct).length}</td>
                    <td><Link className="button secondary" href={`/admin/scenarios?edit=${scenario.id}`} aria-label={`Edit ${scenario.name}`}>Edit</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="muted">There are no scenarios yet.</p>}
    </div>
  );
}
