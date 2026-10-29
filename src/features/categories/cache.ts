import type { Category } from "./schemas";

/** Önce giderler, sonra gelirler; her grupta Türkçe alfabetik sıra. */
export function sortCategories(list: readonly Category[]): Category[] {
  return [...list].sort((a, b) => {
    if (a.type !== b.type) return a.type === "expense" ? -1 : 1;
    return a.name.localeCompare(b.name, "tr");
  });
}

export function upsertCategory(
  list: readonly Category[],
  category: Category,
): Category[] {
  return sortCategories([
    ...list.filter((item) => item.id !== category.id),
    category,
  ]);
}

export function removeCategory(
  list: readonly Category[],
  id: string,
): Category[] {
  return list.filter((item) => item.id !== id);
}
