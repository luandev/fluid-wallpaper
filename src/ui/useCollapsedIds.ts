import { useCallback, useState } from "react";

export function useCollapsedIds(): {
  isCollapsed: (id: string) => boolean;
  toggle: (id: string) => void;
} {
  const [ids, setIds] = useState<ReadonlySet<string>>(() => new Set());
  const toggle = useCallback((id: string): void => {
    setIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);
  return {
    isCollapsed: (id) => ids.has(id),
    toggle,
  };
}
