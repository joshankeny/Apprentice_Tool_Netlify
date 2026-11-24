import { TOOL_TRADE_COLUMNS, type ToolTrades } from "./tool-fields";

function tradeValue(value: boolean | null) {
  if (value === null) return "Unset";
  return value ? "Yes" : "No";
}

export function CatalogTrades({ trades }: { trades: ToolTrades }) {
  const isGeneral = TOOL_TRADE_COLUMNS.every(({ column }) => trades[column] === null);

  return (
    <div className="admin-trade-cell">
      {isGeneral && <strong>General</strong>}
      <ul className="admin-trade-values">
        {TOOL_TRADE_COLUMNS.map(({ column, label }) => (
          <li key={column}>{label} <span className="muted">{tradeValue(trades[column])}</span></li>
        ))}
      </ul>
    </div>
  );
}
