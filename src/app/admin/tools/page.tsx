import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { publicToolImageUrl } from "@/lib/storage";
import { ToolCatalog } from "./tool-catalog";

export default async function AdminToolsPage({
  searchParams
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const [{ data, error }, { saved }] = await Promise.all([
    supabase.from("tools")
      .select("id,formal_name,common_name,status,image_path,is_wire,is_line,is_meter,tool_families(name)")
      .order("formal_name")
      .order("id"),
    searchParams
  ]);
  const tools = (data ?? []).map((tool) => {
    const family = Array.isArray(tool.tool_families) ? tool.tool_families[0] : tool.tool_families;
    return {
      id: tool.id,
      formalName: tool.formal_name,
      commonName: tool.common_name,
      status: tool.status,
      family: family?.name ?? "Unassigned",
      trades: { is_wire: tool.is_wire, is_line: tool.is_line, is_meter: tool.is_meter },
      imageUrl: publicToolImageUrl(process.env.NEXT_PUBLIC_SUPABASE_URL!, tool.image_path)
    };
  });

  return (
    <div className="grid">
      <div className="admin-heading">
        <div>
          <Link href="/admin" className="admin-back">Back to Admin</Link>
          <h1>Tool Catalog</h1>
          <p className="muted">Add tools, update details, and manage training photos.</p>
        </div>
        <Link href="/admin/tools/new" className="button">Add Tool</Link>
      </div>
      {saved === "edited" && <p className="admin-save-status" role="status">Tool changes saved.</p>}
      {saved === "added" && <p className="admin-save-status" role="status">Tool added.</p>}
      {error
        ? <p className="warning" role="alert">The tool catalog could not be loaded. Refresh to try again.</p>
        : <ToolCatalog tools={tools} />}
    </div>
  );
}
