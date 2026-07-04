import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

// Keeps a local input value responsive while debouncing writes to the URL search
// param that drives the React Query cache key (avoids refetching on every keystroke).
export function useDebouncedSearchParam(key: string, delayMs = 300) {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlValue = searchParams.get(key) || '';
  const [localValue, setLocalValue] = useState(urlValue);

  useEffect(() => {
    setLocalValue(urlValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlValue]);

  useEffect(() => {
    const handle = setTimeout(() => {
      if (localValue === urlValue) return;
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (localValue) next.set(key, localValue);
          else next.delete(key);
          return next;
        },
        { replace: true }
      );
    }, delayMs);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localValue]);

  return [localValue, setLocalValue] as const;
}
