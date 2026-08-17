import type { ReactNode } from "react";
import { formatNumber } from "./format";

type RangeRowProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  live?: number;
  driverName?: string;
  onChange: (next: number) => void;
};

export function RangeRow({
  label,
  value,
  min,
  max,
  step,
  live,
  driverName,
  onChange,
}: RangeRowProps): ReactNode {
  const driven = Boolean(driverName);
  return (
    <label className="dash__row">
      <div className="dash__meta">
        <span className="dash__label">{label}</span>
        <span className="dash__readouts">
          <span className="dash__value">{formatNumber(value, step)}</span>
          {driven && live !== undefined ? (
            <span className="dash__value dash__live">{formatNumber(live, step)}</span>
          ) : null}
          {driverName ? <span className="dash__chip">driven by {driverName}</span> : null}
        </span>
      </div>
      <input
        className="dash__input"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

type ToggleRowProps = {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
};

export function ToggleRow({ label, value, onChange }: ToggleRowProps): ReactNode {
  return (
    <label className="dash__row">
      <div className="dash__meta">
        <span className="dash__label">{label}</span>
        <span className="dash__value">{value ? "on" : "off"}</span>
      </div>
      <input
        className="dash__input"
        type="checkbox"
        checked={value}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

type ColorRowProps = {
  label: string;
  value: string;
  onChange: (next: string) => void;
};

export function ColorRow({ label, value, onChange }: ColorRowProps): ReactNode {
  return (
    <label className="dash__row">
      <div className="dash__meta">
        <span className="dash__label">{label}</span>
        <span className="dash__value">{value}</span>
      </div>
      <input className="dash__input" type="color" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

type SelectRowProps = {
  label: string;
  value: string;
  display?: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (next: string) => void;
};

export function SelectRow({ label, value, display, options, onChange }: SelectRowProps): ReactNode {
  const shown = display ?? options.find((option) => option.value === value)?.label ?? value;
  return (
    <label className="dash__row">
      <div className="dash__meta">
        <span className="dash__label">{label}</span>
        <span className="dash__value">{shown}</span>
      </div>
      <select className="dash__input dash__select" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
