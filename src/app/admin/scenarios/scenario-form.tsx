"use client";

import Link from "next/link";
import { startTransition, useActionState, type FormEvent } from "react";
import { saveScenario } from "./actions";

type Scenario = {
  id: string;
  updated_at: string;
  name: string;
  description: string;
  status: string;
  scenario_tools: { tool_id: string; is_correct: boolean }[];
};

export function ScenarioForm({
  scenario,
  tools
}: {
  scenario?: Scenario;
  tools: { id: string; formal_name: string; status: string }[];
}) {
  const [error, save, pending] = useActionState(
    saveScenario.bind(null, scenario?.id ?? null, scenario?.updated_at ?? null),
    ""
  );

  const correctTools = new Set(scenario?.scenario_tools.filter((link) => link.is_correct).map((link) => link.tool_id));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    startTransition(() => save(data));
  }

  return (
    <form className="card grid admin-tool-page" onSubmit={submit}>
      <label>Scenario name<input name="name" defaultValue={scenario?.name} maxLength={200} required /></label>
      <label>Use case<textarea name="description" defaultValue={scenario?.description} rows={4} maxLength={4000} required /></label>
      <label>
        Status
        <select name="status" defaultValue={scenario?.status ?? "draft"}>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </label>
      <fieldset className="grid admin-tool-options">
        <legend>Correct tools</legend>
        <small className="muted">Select every tool that would be a correct answer. Publishing requires at least one published tool.</small>
        {tools.map((tool) => (
          <label className="toggle-row" key={tool.id}>
            <input type="checkbox" name="tool_id" value={tool.id} defaultChecked={correctTools.has(tool.id)} />
            <span>{tool.formal_name}{tool.status === "published" ? "" : ` (${tool.status})`}</span>
          </label>
        ))}
        {!tools.length && <p className="muted">Add a tool to the catalog before picking correct answers.</p>}
      </fieldset>
      {error && <p className="warning" role="alert">{error}</p>}
      <div className="admin-actions">
        <button className="button" type="submit" disabled={pending}>{pending ? "Saving…" : "Save Scenario"}</button>
        <Link className="button secondary" href="/admin/scenarios">Cancel</Link>
      </div>
    </form>
  );
}
