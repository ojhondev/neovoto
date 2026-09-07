"use client";

import { useCallback, useSyncExternalStore } from "react";

/** Boolean persistido em localStorage, sem setState em efeito (usa useSyncExternalStore). */
export function useLocalStorageBoolean(
  key: string,
  initial = false,
): readonly [boolean, (next: boolean) => void] {
  const subscribe = useCallback((cb: () => void) => {
    window.addEventListener("storage", cb);
    return () => window.removeEventListener("storage", cb);
  }, []);

  const getSnapshot = useCallback(() => {
    try {
      const v = window.localStorage.getItem(key);
      return v == null ? initial : v === "true";
    } catch {
      return initial;
    }
  }, [key, initial]);

  const getServerSnapshot = useCallback(() => initial, [initial]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const set = useCallback(
    (next: boolean) => {
      try {
        window.localStorage.setItem(key, String(next));
      } catch {
        /* modo privado / bloqueado */
      }
      window.dispatchEvent(new StorageEvent("storage", { key }));
    },
    [key],
  );

  return [value, set] as const;
}
