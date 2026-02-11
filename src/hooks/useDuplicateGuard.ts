import { useRef, useCallback } from "react";

/**
 * Hook to prevent duplicate submissions within a time window.
 * Returns a wrapper function that blocks repeated calls within the specified interval.
 */
export const useDuplicateGuard = (intervalMs = 20000) => {
  const lastSubmitRef = useRef<{ key: string; time: number } | null>(null);

  const isDuplicate = useCallback((key: string): boolean => {
    const now = Date.now();
    if (lastSubmitRef.current && 
        lastSubmitRef.current.key === key && 
        now - lastSubmitRef.current.time < intervalMs) {
      return true;
    }
    lastSubmitRef.current = { key, time: now };
    return false;
  }, [intervalMs]);

  const generateKey = useCallback((...values: (string | number | undefined | null)[]): string => {
    return values.filter(Boolean).join("|").toLowerCase();
  }, []);

  return { isDuplicate, generateKey };
};
