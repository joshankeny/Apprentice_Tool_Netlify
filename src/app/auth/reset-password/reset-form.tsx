"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";

type Recovery =
  | { token_hash: string }
  | { access_token: string; refresh_token: string };

const INVALID_LINK = "This link has expired or is invalid. Ask your training administrator for a new reset email.";

export function ResetPasswordForm() {
  const readLink = useRef(false);
  const verifiedClient = useRef<SupabaseClient | null>(null);
  const [recovery, setRecovery] = useState<Recovery | null>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    if (readLink.current) return;
    readLink.current = true;
    const { search, hash: fragment, pathname } = window.location;
    const query = new URLSearchParams(search);
    const hash = new URLSearchParams(fragment.slice(1));
    if (search || fragment) window.history.replaceState(window.history.state, "", pathname);

    const tokenHash = query.get("token_hash");
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    if (tokenHash) {
      setRecovery({ token_hash: tokenHash });
    } else if (accessToken && refreshToken && hash.get("type") === "recovery") {
      setRecovery({ access_token: accessToken, refresh_token: refreshToken });
    } else {
      if (query.has("error") || hash.has("error")) setError(INVALID_LINK);
      setRecovery(null);
    }
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!recovery || busy) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    if (password !== form.get("confirm")) {
      setError("Passwords must match.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      let supabase = verifiedClient.current;
      if (!supabase) {
        supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
          {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
              detectSessionInUrl: false,
              storageKey: "apprentice-password-recovery"
            }
          }
        );

        const { data, error: recoveryError } = "token_hash" in recovery
          ? await supabase.auth.verifyOtp({ ...recovery, type: "recovery" })
          : await supabase.auth.setSession(recovery);

        if (recoveryError || !data.user || !data.session) {
          setRecovery(null);
          throw new Error(INVALID_LINK);
        }

        const { data: profile } = await supabase.from("profiles").select("active").eq("id", data.user.id).single();
        if (!profile?.active) {
          setRecovery(null);
          await supabase.auth.signOut({ scope: "local" });
          throw new Error("This account is unavailable. Contact your training administrator.");
        }

        verifiedClient.current = supabase;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      verifiedClient.current = null;
      setComplete(true);
      setRecovery(null);
      const { error: signOutError } = await supabase.auth.signOut({ scope: "local" });
      if (signOutError) setError("Your password changed, but this session could not be signed out.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "The password could not be changed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card grid login-card">
      <h1>Reset Password</h1>
      {recovery === undefined && <p role="status">Checking your reset link…</p>}
      {complete && <p role="status">Your password has been updated.</p>}
      {recovery === null && !complete && !error &&
        <p className="warning">Open the link from your password reset email or ask your training administrator for a new one.</p>}
      {error && <p className="warning" role="alert">{error}</p>}
      {recovery ? (
        <form className="grid" onSubmit={submit}>
          <label>New password<input name="password" type="password" autoComplete="new-password" required /></label>
          <label>Confirm new password<input name="confirm" type="password" autoComplete="new-password" required /></label>
          <button className="button" disabled={busy}>{busy ? "Updating…" : "Update Password"}</button>
        </form>
      ) : <Link className="button secondary" href="/login">Back to Sign In</Link>}
    </div>
  );
}
