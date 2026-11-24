"use client";

import { useState } from "react";
import { setTemporaryPassword } from "./actions";

export function TemporaryPasswordControl({
  userId,
  displayName
}: {
  userId: string;
  displayName: string;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function resetPassword() {
    if (pending || !window.confirm(`Replace the password for ${displayName}?`)) return;
    setPending(true);
    setError("");

    try {
      const result = await setTemporaryPassword(userId);
      if ("error" in result) {
        setError(result.error);
      } else {
        setPassword(result.password);
      }
    } catch {
      setError("The app could not confirm the reset. Try again before sharing a password.");
    } finally {
      setPending(false);
    }
  }

  if (password) {
    return (
      <div className="card grid">
        <p className="muted">Share this password privately before closing. The learner can change it in Profile.</p>
        <label>
          Temporary password
          <input
            type="text"
            value={password}
            readOnly
            autoComplete="off"
            spellCheck={false}
            onFocus={(event) => event.currentTarget.select()}
          />
        </label>
        <button className="button secondary" type="button" onClick={() => setPassword("")}>
          Hide Password
        </button>
      </div>
    );
  }

  return (
    <div className="grid logout-control">
      <button className="button secondary" type="button" onClick={resetPassword} disabled={pending}>
        {pending ? "Setting password…" : "Set Temporary Password"}
      </button>
      {error && <p className="warning" role="alert">{error}</p>}
    </div>
  );
}
