"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { THEME_COOKIE, resolveTheme, type Theme } from "@/lib/theme";

export function AppearanceSetting({ initialTheme }: { initialTheme: Theme }) {
  const [theme, setTheme] = useState(initialTheme);
  const router = useRouter();

  function updateTheme(value: string) {
    const nextTheme = resolveTheme(value);
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${THEME_COOKIE}=${nextTheme}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
    document.documentElement.dataset.theme = nextTheme;
    setTheme(nextTheme);
    router.refresh();
  }

  return (
    <label>
      Appearance
      <select value={theme} onChange={(event) => updateTheme(event.target.value)}>
        <option value="system">Use device setting</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
      <small className="muted">Saved in this browser.</small>
    </label>
  );
}

export function LogoutButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function logout() {
    setBusy(true);
    setError("");
    try {
      const { error } = await createClient().auth.signOut({ scope: "local" });
      if (error) throw error;
      window.location.replace("/login");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not log out.");
      setBusy(false);
    }
  }

  return (
    <div className="grid logout-control">
      {error && <p className="warning" role="alert">{error}</p>}
      <button className="button secondary" type="button" onClick={logout} disabled={busy}>
        {busy ? "Logging out…" : "Log out"}
      </button>
    </div>
  );
}
