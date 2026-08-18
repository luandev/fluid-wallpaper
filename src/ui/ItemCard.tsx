import type { MouseEvent, ReactNode } from "react";

export function ItemCard({
  selected,
  collapsed,
  canDuplicate,
  onToggleCollapse,
  onSelect,
  onDuplicate,
  onRemove,
  removeDisabled,
  nameSlot,
  children,
}: {
  selected?: boolean;
  collapsed: boolean;
  canDuplicate: boolean;
  onToggleCollapse: () => void;
  onSelect?: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  removeDisabled?: boolean;
  nameSlot: ReactNode;
  children: ReactNode;
}): ReactNode {
  const stop = (event: MouseEvent): void => {
    event.stopPropagation();
  };
  return (
    <article
      className="dash__item"
      data-selected={selected ? "true" : "false"}
      data-collapsed={collapsed ? "true" : "false"}
      onClick={onSelect}
    >
      <div className="dash__item-head">
        <button
          type="button"
          className="dash__btn dash__collapse"
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand" : "Collapse"}
          title={collapsed ? "Expand" : "Collapse"}
          onClick={(event) => {
            stop(event);
            onToggleCollapse();
          }}
        >
          {collapsed ? "▸" : "▾"}
        </button>
        {nameSlot}
        <button
          type="button"
          className="dash__btn"
          disabled={!canDuplicate}
          title="Duplicate"
          onClick={(event) => {
            stop(event);
            onDuplicate();
          }}
        >
          Duplicate
        </button>
        <button
          type="button"
          className="dash__btn"
          disabled={removeDisabled}
          onClick={(event) => {
            stop(event);
            onRemove();
          }}
        >
          Remove
        </button>
      </div>
      {collapsed ? null : children}
    </article>
  );
}
