import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { formatNumber } from "./format";
import { clampNumberField, fineStep, nudgeNumber } from "./rangeMath";

function useShiftHeld(): boolean {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    const onDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key === "Shift") {
        setHeld(true);
      }
    };
    const onUp = (event: globalThis.KeyboardEvent): void => {
      if (event.key === "Shift") {
        setHeld(false);
      }
    };
    const clear = (): void => setHeld(false);
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", clear);
    };
  }, []);
  return held;
}

function HelpText({ help }: { help?: string }): ReactNode {
  if (!help) {
    return null;
  }
  return (
    <p className="dash__help" title={help}>
      {help}
    </p>
  );
}

type RangeRowProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  live?: number;
  driverName?: string;
  help?: string;
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
  help,
  onChange,
}: RangeRowProps): ReactNode {
  const driven = Boolean(driverName);
  const shift = useShiftHeld();
  const usedStep = shift ? fineStep(step) : step;
  const [draft, setDraft] = useState(() => formatNumber(value, step));
  const focused = useRef(false);
  const controlsRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    if (!focused.current) {
      setDraft(formatNumber(value, step));
    }
  }, [value, step]);

  const bump = (direction: 1 | -1, fine: boolean): void => {
    const size = fine ? fineStep(step) : step;
    onChange(nudgeNumber(valueRef.current, direction, size, min, max));
  };
  const bumpRef = useRef(bump);
  bumpRef.current = bump;

  useEffect(() => {
    const el = controlsRef.current;
    if (!el) {
      return;
    }
    const onWheel = (event: WheelEvent): void => {
      event.preventDefault();
      bumpRef.current(event.deltaY < 0 ? 1 : -1, event.shiftKey);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const commitDraft = (): void => {
    onChange(clampNumberField(draft, min, max, value));
  };

  const onNumberKey = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Enter") {
      event.currentTarget.blur();
      return;
    }
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
      return;
    }
    event.preventDefault();
    bump(event.key === "ArrowUp" ? 1 : -1, event.shiftKey);
  };

  return (
    <div className="dash__row">
      <div className="dash__meta">
        <span className="dash__label">{label}</span>
        <span className="dash__readouts">
          {driven && live !== undefined ? (
            <span className="dash__value dash__live">{formatNumber(live, step)}</span>
          ) : null}
          {driverName ? <span className="dash__chip">driven by {driverName}</span> : null}
        </span>
      </div>
      <div className="dash__range-controls" ref={controlsRef}>
        <input
          className="dash__input"
          type="range"
          min={min}
          max={max}
          step={usedStep}
          value={value}
          title={help}
          aria-label={label}
          tabIndex={-1}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <div className="dash__stepper">
          <input
            className="dash__input dash__text dash__number"
            type="text"
            inputMode="decimal"
            value={draft}
            title={help}
            aria-label={`${label} value`}
            onFocus={() => {
              focused.current = true;
            }}
            onBlur={() => {
              focused.current = false;
              commitDraft();
            }}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onNumberKey}
          />
          <div className="dash__stepper-btns">
            <button
              type="button"
              className="dash__stepper-btn"
              tabIndex={-1}
              aria-label={`Increase ${label}`}
              onClick={() => bump(1, shift)}
            >
              ▲
            </button>
            <button
              type="button"
              className="dash__stepper-btn"
              tabIndex={-1}
              aria-label={`Decrease ${label}`}
              onClick={() => bump(-1, shift)}
            >
              ▼
            </button>
          </div>
        </div>
      </div>
      <HelpText help={help} />
    </div>
  );
}

type ToggleRowProps = {
  label: string;
  value: boolean;
  help?: string;
  onChange: (next: boolean) => void;
};

export function ToggleRow({ label, value, help, onChange }: ToggleRowProps): ReactNode {
  return (
    <label className="dash__row" title={help}>
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
      <HelpText help={help} />
    </label>
  );
}

type ColorRowProps = {
  label: string;
  value: string;
  help?: string;
  onChange: (next: string) => void;
};

export function ColorRow({ label, value, help, onChange }: ColorRowProps): ReactNode {
  return (
    <label className="dash__row" title={help}>
      <div className="dash__meta">
        <span className="dash__label">{label}</span>
        <span className="dash__value">{value}</span>
      </div>
      <input className="dash__input" type="color" value={value} onChange={(event) => onChange(event.target.value)} />
      <HelpText help={help} />
    </label>
  );
}

type SelectRowProps = {
  label: string;
  value: string;
  display?: string;
  help?: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  onChange: (next: string) => void;
};

export function SelectRow({ label, value, help, options, onChange }: SelectRowProps): ReactNode {
  return (
    <label className="dash__row" title={help}>
      <div className="dash__meta">
        <span className="dash__label">{label}</span>
      </div>
      <select className="dash__input dash__select" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <HelpText help={help} />
    </label>
  );
}
