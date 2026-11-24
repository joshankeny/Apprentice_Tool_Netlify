export function weightedPick<T>(items: T[], getWeight: (item: T) => number): T {
  if (!items.length) throw new Error("Cannot choose from an empty list.");
  const weights = items.map((item) => Math.max(0, getWeight(item)));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) return items[Math.floor(Math.random() * items.length)];
  let target = Math.random() * total;
  for (let i = 0; i < items.length; i += 1) {
    target -= weights[i];
    if (target <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function sampleWithoutReplacement<T>(items: T[], count: number): T[] {
  const working = [...items];
  const selected: T[] = [];
  while (working.length && selected.length < count) {
    const index = Math.floor(Math.random() * working.length);
    selected.push(working.splice(index, 1)[0]);
  }
  return selected;
}
