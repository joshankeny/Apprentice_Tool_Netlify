import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { ProgressTable, type ProgressReport } from "./progress-table";

export default async function LearnerProgressPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase.rpc("admin_learner_progress_report");

  return (
    <div className="grid">
      <div>
        <Link className="admin-back" href="/admin">Back to Admin</Link>
        <h1>Learner Progress</h1>
        <p className="muted">Review training activity and export a snapshot for a supervisor.</p>
      </div>
      {error || !data ? (
        <p className="warning" role="alert">The report could not be loaded. Refresh to try again.</p>
      ) : (
        <ProgressTable report={data as ProgressReport} />
      )}
    </div>
  );
}
