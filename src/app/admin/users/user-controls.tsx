"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import { manageUser } from "./actions";
import { TemporaryPasswordControl } from "./temporary-password-control";

export function UserControls({
  user,
  isCurrentUser
}: {
  user: { id: string; display_name: string; active: boolean; email: string | null; role: string };
  isCurrentUser: boolean;
}) {
  const [state, dispatch, pending] = useActionState(manageUser.bind(null, user.id), null);

  const canPromote = !isCurrentUser && user.role === "learner" && user.active;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const data = new FormData(event.currentTarget, submitter);
    if (data.get("intent") === "promote") {
      const account = user.email ? `${user.display_name} (${user.email})` : user.display_name;
      if (!window.confirm(`Grant full Admin access to ${account}?`)) return;
    }
    startTransition(() => dispatch(data));
  }

  return (
    <div className="grid">
      <form className="grid admin-user-form" onSubmit={submit}>
        <label>
          Display name
          <input name="display_name" defaultValue={user.display_name} maxLength={120} required />
        </label>
        <label>
          Account status
          <select name="active" defaultValue={String(user.active)} disabled={isCurrentUser}>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </label>
        <div className="admin-actions">
          <button className="button" name="intent" value="save" disabled={pending}>Save</button>
          <button
            className="button secondary"
            name="intent"
            value="reset"
            disabled={pending || !user.active || !user.email}
            formNoValidate
            onClick={(event) => {
              if (!window.confirm(`Send a password reset email to ${user.email}?`)) event.preventDefault();
            }}
          >
            Send Password Reset
          </button>
          {canPromote && (
            <button className="button secondary" name="intent" value="promote" disabled={pending} formNoValidate>
              Promote to Admin
            </button>
          )}
        </div>
        {state && <p className={state.kind === "error" ? "warning" : "muted"} role={state.kind === "error" ? "alert" : "status"}>{state.message}</p>}
      </form>
      {user.role === "learner" && user.active && (
        <TemporaryPasswordControl userId={user.id} displayName={user.display_name} />
      )}
    </div>
  );
}
