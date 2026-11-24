import { notFound } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { publicToolImageUrl } from "@/lib/storage";
import { ToolForm } from "../../tool-form";

export default async function EditToolPage({ params }: { params: Promise<{ toolId: string }> }) {
  const { supabase } = await requireAdmin();
  const { toolId } = await params;
  if (!z.uuid().safeParse(toolId).success) notFound();

  const [{ data: tool, error: toolError }, { data: families, error: familiesError }] = await Promise.all([
    supabase.from("tools")
      .select("id,formal_name,common_name,family_id,use_description,location,status,image_path,updated_at,is_wire,is_line,is_meter")
      .eq("id", toolId)
      .maybeSingle(),
    supabase.from("tool_families").select("id,name,active").order("name")
  ]);

  if (toolError || familiesError) {
    return <p className="warning">The tool editor could not be loaded. Refresh to try again.</p>;
  }
  if (!tool) notFound();

  return (
    <div className="grid admin-tool-page">
      <div>
        <h1>Edit Tool</h1>
        <p className="muted">{tool.formal_name}</p>
      </div>
      <ToolForm
        tool={tool}
        families={(families ?? []).filter((family) => family.active || family.id === tool.family_id)}
        imageUrl={publicToolImageUrl(process.env.NEXT_PUBLIC_SUPABASE_URL!, tool.image_path)}
      />
    </div>
  );
}
