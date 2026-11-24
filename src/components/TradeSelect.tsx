import { TRADES, type Trade } from "@/lib/trades";

export function TradeSelect({
  trade,
  onChange
}: {
  trade?: Trade;
  onChange?: (trade: Trade) => void;
}) {
  return (
    <label>
      Trade
      <select name="trade" defaultValue={trade ?? ""} required onChange={(event) => onChange?.(event.target.value as Trade)}>
        <option value="" disabled>Select a trade</option>
        {Object.entries(TRADES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </label>
  );
}
