"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export function ChangePasswordForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    setError("");
    setSaved(false);
    const form = event.currentTarget;
    const fields = new FormData(form);
    const currentPassword = String(fields.get("currentPassword") ?? "");
    const password = String(fields.get("password") ?? "");
    if (password !== fields.get("confirmPassword")) {
      setError("New passwords must match.");
      return;
    }

    setBusy(true);
    try {
      const { error } = await createClient().auth.updateUser({
        current_password: currentPassword,
        password
      });
      if (error) throw error;
      form.reset();
      setSaved(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Your password could not be changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card grid settings-card" aria-labelledby="change-password-heading">
      <h2 id="change-password-heading">Change Password</h2>
      <form className="grid" onSubmit={changePassword}>
        <label>
          Current password
          <input name="currentPassword" type="password" autoComplete="current-password" required />
        </label>
        <label>
          New password
          <input name="password" type="password" autoComplete="new-password" required />
        </label>
        <label>
          Confirm new password
          <input name="confirmPassword" type="password" autoComplete="new-password" required />
        </label>
        {error && <p className="warning" role="alert">{error}</p>}
        {saved && <p className="muted" role="status">Password updated.</p>}
        <button className="button" type="submit" disabled={busy}>{busy ? "Updating…" : "Update Password"}</button>
      </form>
    </section>
  );
}
