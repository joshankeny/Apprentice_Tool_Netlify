"use client";

import { type FormEvent, useState } from "react";

export default function RoundSetup({
  label,
  buttonLabel,
  defaultCount,
  onBegin
}: {
  label: string;
  buttonLabel: string;
  defaultCount: number;
  onBegin: (count: number) => void;
}) {
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const entry = String(new FormData(event.currentTarget).get("count") ?? "").trim();
    const count = Number(entry);

    if (!/^\d+$/.test(entry) || !Number.isSafeInteger(count) || count < 1) {
      setError("Enter a whole number greater than zero.");
      return;
    }

    onBegin(count);
  }

  return (
    <form className="card grid round-setup" onSubmit={submit} noValidate>
      <label>
        {label}
        <input
          name="count"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          defaultValue={defaultCount}
          required
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "round-count-error" : undefined}
          onChange={() => setError("")}
        />
      </label>
      {error && <p id="round-count-error" className="warning" role="alert">{error}</p>}
      <button className="button" type="submit">{buttonLabel}</button>
    </form>
  );
}
