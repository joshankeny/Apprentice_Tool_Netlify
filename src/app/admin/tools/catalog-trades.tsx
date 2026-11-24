"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import { saveToolTrades } from "./actions";
import { TOOL_TRADE_COLUMNS, type ToolTrades } from "./tool-fields";
import { ToolTradeFields } from "./tool-trade-fields";

function tradeValue(value: boolean | null) {
  if (value === null) return "Unset";
  return value ? "Yes" : "No";
}

export function CatalogTrades({ toolId, toolName, version, trades }: {
  toolId: string;
  toolName: string;
  version: string;
  trades: ToolTrades;
}) {
  const [result, save, pending] = useActionState(saveToolTrades.bind(null, toolId), null);
  const isGeneral = TOOL_TRADE_COLUMNS.every(({ column }) => trades[column] === null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    startTransition(() => save(data));
  }

  return (
    <div className="admin-trade-cell">
      {isGeneral && <strong>General</strong>}
      <ul className="admin-trade-values">
        {TOOL_TRADE_COLUMNS.map(({ column, label }) => (
          <li key={column}>{label} <span className="muted">{tradeValue(trades[column])}</span></li>
        ))}
      </ul>
      <details>
        <summary className="admin-back" aria-label={`Edit trades for ${toolName}`}>Edit trades</summary>
        <form className="grid" onSubmit={submit}>
          <input type="hidden" name="updated_at" value={version} />
          <ToolTradeFields key={version} trades={trades} />
          <button className="button secondary" type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save trades"}
          </button>
        </form>
      </details>
      {result && (
        <p className={result.error ? "warning" : "muted"} role={result.error ? "alert" : "status"}>
          {result.message}
        </p>
      )}
    </div>
  );
}
