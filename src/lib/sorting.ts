export type SortDirection = "asc" | "desc";

export type SortState<Key extends string> = {
  key: Key;
  direction: SortDirection;
};

const sortPrimitive = (value: string | number) => (typeof value === "number" ? value : value.toLocaleLowerCase("es-UY"));

export function compareValues(a: string | number, b: string | number) {
  const left = sortPrimitive(a);
  const right = sortPrimitive(b);
  if (typeof left === "number" && typeof right === "number") return left - right;
  return String(left).localeCompare(String(right), "es-UY", { numeric: true, sensitivity: "base" });
}

export function nextSort<Key extends string>(current: SortState<Key>, key: Key): SortState<Key> {
  if (current.key !== key) return { key, direction: "asc" };
  return { key, direction: current.direction === "asc" ? "desc" : "asc" };
}

export function sortIndicator<Key extends string>(sort: SortState<Key>, key: Key) {
  if (sort.key !== key) return "";
  return sort.direction === "asc" ? " asc" : " desc";
}
