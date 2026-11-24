"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import { manageUser } from "./actions";

export function UserControls({
  user,
  isCurrentUser
}: {
  user: { id: string; display_name: string; active: boolean; email: string | null };
  isCurrentUser: boolean;
}) {
  const [state, dispatch, pending] = useActionState(manageUser.bind(null, user.id), null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const data = new FormData(event.currentTarget, submitter);
    startTransition(() => dispatch(data));
  }

  return (
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
      </div>
      {state && <p className={state.kind === "error" ? "warning" : "muted"} role={state.kind === "error" ? "alert" : "status"}>{state.message}</p>}
    </form>
  );
}
