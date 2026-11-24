import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { UserControls } from "./user-controls";

type TrainingUser = {
  id: string;
  display_name: string;
  email: string | null;
  role: string;
  active: boolean;
};

export default async function UsersPage() {
  const { supabase, userId } = await requireAdmin();
  const { data, error } = await supabase.rpc("admin_list_training_users");
  const users = (data ?? []) as TrainingUser[];

  return (
    <div className="grid">
      <div className="admin-heading">
        <div>
          <Link className="admin-back" href="/admin">Back to Admin</Link>
          <h1>Users</h1>
          <p className="muted">Inactive users retain their training history and lose access to training.</p>
        </div>
      </div>
      {error ? <p className="warning" role="alert">Users could not be loaded. Refresh to try again.</p> :
        users.length ? (
          <div className="card admin-table-wrap">
            <table className="table admin-tool-table">
              <thead><tr><th scope="col">User</th><th scope="col">Role</th><th scope="col">Account settings</th></tr></thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <th scope="row">
                      {user.display_name}{user.id === userId && " (you)"}
                      <span className="muted admin-common-name">{user.email ?? "No email"}</span>
                    </th>
                    <td className="admin-status">{user.role}</td>
                    <td><UserControls user={user} isCurrentUser={user.id === userId} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="muted">No users found.</p>}
    </div>
  );
}
