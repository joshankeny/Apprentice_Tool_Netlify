"use client";

import { type FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm({ confirmationMessage }: { confirmationMessage: string }) {
  const [creating, setCreating] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(confirmationMessage);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();

    try {
      const supabase = createClient();

      if (creating) {
        const displayName = String(form.get("displayName") ?? "").trim();
        if (!displayName) throw new Error("Enter your display name.");
        if (password !== form.get("confirmPassword")) throw new Error("Passwords must match.");

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: new URL("/auth/confirm", window.location.origin).href
          }
        });

        if (error) throw error;
        if (!data.session) {
          setNotice("Check your email for a confirmation link, then sign in.");
          setPassword("");
          setCreating(false);
          return;
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const { data: profile } = await supabase.from("profiles").select("active").eq("id", data.user.id).single();
        if (!profile?.active) {
          await supabase.auth.signOut({ scope: "local" });
          throw new Error("This account is unavailable. Contact your training administrator.");
        }
      }

      window.location.replace("/learn");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not complete the request.");
    } finally {
      setBusy(false);
    }
  }

  function switchMode() {
    setCreating(!creating);
    setPassword("");
    setError("");
    setNotice("");
  }

  return (
    <div className="card grid login-card">
      <h1>{creating ? "Create account" : "Sign in"}</h1>
      <form className="grid" onSubmit={submit}>
        {creating && (
          <label key="name">
            Display name
            <input name="displayName" autoComplete="name" required />
          </label>
        )}
        <label key="email">
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label key="password">
          Password
          <input
            name="password"
            type="password"
            autoComplete={creating ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {creating && (
          <label key="confirm">
            Confirm password
            <input name="confirmPassword" type="password" autoComplete="new-password" required />
          </label>
        )}
        {error && <p className="warning" role="alert">{error}</p>}
        {notice && <p className="muted" role="status">{notice}</p>}
        <button className="button" type="submit" disabled={busy}>
          {busy ? "Please wait…" : creating ? "Create account" : "Sign in"}
        </button>
      </form>
      <button className="button secondary" type="button" onClick={switchMode} disabled={busy}>
        {creating ? "Back to sign in" : "Create an account"}
      </button>
    </div>
  );
}
