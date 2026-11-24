import { requireAdmin } from "@/lib/auth";
import { ToolForm } from "../tool-form";

export default async function NewToolPage() {
  const { supabase } = await requireAdmin();
  const { data: families, error } = await supabase
    .from("tool_families")
    .select("id,name,active")
    .eq("active", true)
    .order("name");

  return (
    <div className="grid admin-tool-page">
      <div>
        <h1>Add Tool</h1>
        <p className="muted">Save as a draft or publish it so it can appear in training.</p>
      </div>
      {error || !families?.length
        ? <p className="warning">{error ? "Tool families could not be loaded. Refresh to try again." : "An active tool family is required to add a tool."}</p>
        : <ToolForm families={families} />}
    </div>
  );
}
