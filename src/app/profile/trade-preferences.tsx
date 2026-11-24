"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { TradeSelect } from "@/components/TradeSelect";
import { type Trade } from "@/lib/trades";
import { saveTradePreferences } from "./trade-actions";

export function TradePreferences({ initialTrade, initialTradeOnly }: {
  initialTrade: Trade;
  initialTradeOnly: boolean;
}) {
  const [trade, setTrade] = useState(initialTrade);
  const [tradeOnly, setTradeOnly] = useState(initialTradeOnly);
  const [result, save, pending] = useActionState(saveTradePreferences, null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    startTransition(() => save(form));
  }

  return (
    <section className="card grid settings-card" aria-labelledby="trade-preferences">
      <h2 id="trade-preferences">Training Preferences</h2>
      <form className="grid" onSubmit={submit}>
        <fieldset className="preferences-fields grid" disabled={pending}>
          <TradeSelect trade={initialTrade} onChange={(selected) => {
            setTrade(selected);
            if (selected === "general") setTradeOnly(false);
          }} />
          <label className="toggle-row">
            <input
              type="checkbox"
              name="tradeOnly"
              checked={tradeOnly}
              disabled={trade === "general"}
              onChange={(event) => setTradeOnly(event.target.checked)}
            />
            <span>
              <strong>Only show tools for my trade</strong>
              <small>{trade === "general" ? "General includes every trade." : "General tools are still included."}</small>
            </span>
          </label>
        </fieldset>
        <button className="button" disabled={pending}>{pending ? "Saving…" : "Save Training Preferences"}</button>
        {result && <p className={result.error ? "warning" : "muted"} role={result.error ? "alert" : "status"}>{result.message}</p>}
      </form>
    </section>
  );
}
