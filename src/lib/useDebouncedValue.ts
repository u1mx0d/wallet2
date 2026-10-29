import { useEffect, useState } from "react";

/** Değer, son değişiklikten `delayMs` sonra güncellenir (arama kutusunda her tuşta sorgu atılmasın). */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
