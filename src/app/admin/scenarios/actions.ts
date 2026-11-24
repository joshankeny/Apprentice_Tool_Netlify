"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";

const scenarioFields = z.object({
  id: z.uuid().nullable(),
  version: z.iso.datetime({ offset: true }).nullable(),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(4000),
  status: z.enum(["draft", "published", "archived"]),
  toolIds: z.array(z.uuid())
});

export async function saveScenario(
  id: string | null,
  version: string | null,
  _previous: string,
  form: FormData
) {
  const { supabase } = await requireAdmin();
  const parsed = scenarioFields.safeParse({
    id,
    version,
    name: form.get("name"),
    description: form.get("description"),
    status: form.get("status"),
    toolIds: form.getAll("tool_id")
  });
  if (!parsed.success) return "Enter a scenario name and use case, then check the selected tools.";

  const { data, error } = await supabase.rpc("admin_save_training_scenario", {
    p_id: parsed.data.id,
    p_version: parsed.data.version,
    p_name: parsed.data.name,
    p_description: parsed.data.description,
    p_status: parsed.data.status,
    p_tool_ids: parsed.data.toolIds
  });

  if (error?.code === "40001") return "This scenario changed. Reopen it before saving again.";
  if (error?.code === "22023") return error.message;
  if (error || !data) {
    console.error("Could not save scenario", error);
    return "The app could not confirm the save. Check the scenario list before retrying.";
  }

  redirect("/admin/scenarios?saved=1");
}
