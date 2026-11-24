"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { THEME_COOKIE } from "@/lib/theme";

export function DarkModeToggle({ initialDark }: { initialDark: boolean }) {
  const [checked, setChecked] = useState(initialDark);

  function toggle(dark: boolean) {
    const theme = dark ? "dark" : "light";
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${THEME_COOKIE}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
    document.documentElement.dataset.theme = theme;
    setChecked(dark);
  }

  return (
    <label className="toggle-row">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => toggle(event.target.checked)}
      />
      <span>
        <strong>Dark mode</strong>
        <small>Saved in this browser.</small>
      </span>
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
