export function toggleMultiSelection(currentValue: string, option: string, maxSelections = 3): string {
  const selected = currentValue.split("||").filter(Boolean);
  if (selected.includes(option)) return selected.filter(value => value !== option).join("||");
  if (selected.length >= maxSelections) return currentValue;
  return [...selected, option].join("||");
}
