import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

// A piece of reference data (categories, stages, Microsoft status...) fetched
// once and shared by every screen that needs it, instead of each component
// requesting it again on mount. Concurrent callers share one request.
export interface CachedResource<T> {
  /** Cached value if still fresh, else fetches (force = always fetch). */
  get: (force?: boolean) => Promise<T>;
  peek: () => T | undefined;
  /** Data changed (e.g. an admin edited it): refetch for whoever is showing it. */
  invalidate: () => void;
  subscribe: (listener: () => void) => () => void;
  clear: () => void;
}

const registry = new Set<CachedResource<unknown>>();

export function createCachedResource<T>(fetcher: () => Promise<T>, ttlMs = 5 * 60_000): CachedResource<T> {
  let value: T | undefined;
  let loadedAt = 0;
  let inflight: Promise<T> | null = null;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  const get = (force = false): Promise<T> => {
    if (!force && value !== undefined && Date.now() - loadedAt < ttlMs) return Promise.resolve(value);
    if (inflight) return inflight;
    inflight = fetcher()
      .then((next) => {
        value = next;
        loadedAt = Date.now();
        notify();
        return next;
      })
      .finally(() => {
        inflight = null;
      });
    return inflight;
  };

  const resource: CachedResource<T> = {
    get,
    peek: () => value,
    invalidate: () => {
      loadedAt = 0;
      if (listeners.size > 0) get(true).catch(() => undefined);
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    clear: () => {
      value = undefined;
      loadedAt = 0;
      notify();
    },
  };
  registry.add(resource as CachedResource<unknown>);
  return resource;
}

/** On logout: nothing cached for one user may show for the next. */
export function clearAllCachedResources(): void {
  registry.forEach((resource) => resource.clear());
}

// enabled: false defers the fetch until the data is actually needed (e.g. a
// closed form drawer or filter popover).
export function useCachedResource<T>(resource: CachedResource<T>, enabled = true) {
  const data = useSyncExternalStore(resource.subscribe, resource.peek);
  const [loading, setLoading] = useState(enabled && data === undefined);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    if (resource.peek() === undefined) setLoading(true);
    resource
      .get()
      .catch(() => undefined)
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [resource, enabled]);

  const refetch = useCallback(() => resource.get(true), [resource]);
  return { data, loading, refetch };
}
