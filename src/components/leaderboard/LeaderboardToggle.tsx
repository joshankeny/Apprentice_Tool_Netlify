"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function LeaderboardToggle({
  initialValue
}: {
  initialValue: boolean;
}) {
  const [checked, setChecked] = useState(initialValue);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function updatePreference(nextValue: boolean) {
    const previous = checked;
    setChecked(nextValue);
    setMessage("");

    startTransition(async () => {
      try {
        const response = await fetch("/api/leaderboard/preference", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leaderboardOptIn: nextValue })
        });

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body?.error ?? "Could not save leaderboard preference.");
        }

        setMessage(nextValue ? "You are shown on the leaderboard." : "You are hidden from the leaderboard.");
        router.refresh();
      } catch (error) {
        setChecked(previous);
        setMessage(error instanceof Error ? error.message : "Could not save leaderboard preference.");
      }
    });
  }

  return (
    <div className="leaderboard-toggle-wrap">
      <label className="toggle-row">
        <input
          type="checkbox"
          checked={checked}
          disabled={isPending}
          onChange={(event) => updatePreference(event.target.checked)}
        />
        <span>
          <strong>Show me on the leaderboard</strong>
          <small>Your training progress is still saved when this is turned off.</small>
        </span>
      </label>
      {message ? <div className="muted toggle-message">{message}</div> : null}
    </div>
  );
}
