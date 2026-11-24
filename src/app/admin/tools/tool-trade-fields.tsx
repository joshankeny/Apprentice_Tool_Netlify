import { TOOL_TRADE_COLUMNS, type ToolTrades } from "./tool-fields";

export function ToolTradeFields({ trades }: { trades?: ToolTrades }) {
  return (
    <fieldset className="preferences-fields grid admin-trade-fields">
      <legend>Trade eligibility</legend>
      {TOOL_TRADE_COLUMNS.map(({ column, label }) => (
        <label key={column}>
          {label}
          <select name={column} defaultValue={trades?.[column] == null ? "unset" : String(trades[column])}>
            <option value="unset">Unset</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </label>
      ))}
    </fieldset>
  );
}
