import type { ReactNode } from "react";
import {
  MAX_WIND_STATIONS,
  createWindStation,
  scatterWindStations,
  type FluidConfig,
  type WindStation,
} from "../../app/config";
import { WIND_FIELD_HELP } from "../../app/fieldHelp";
import { driverNameForPath } from "../../app/drivers";
import { RangeRow, ToggleRow } from "../rows";
import type { PatchFrom } from "../types";

export function WindTab({
  config,
  live,
  selectedId,
  onSelect,
  patchFrom,
}: {
  config: FluidConfig;
  live: FluidConfig;
  selectedId: string | null;
  onSelect: (id: string) => void;
  patchFrom: PatchFrom;
}): ReactNode {
  return (
    <section className="dash__group">
      <div className="dash__group-head">
        <h3 className="dash__group-title">Wind</h3>
        <div className="dash__inline-actions" style={{ margin: 0 }}>
          <button type="button" className="dash__btn" onClick={() => patchFrom(() => ({ windStations: scatterWindStations(4) }))}>
            Scatter
          </button>
          <button
            type="button"
            className="dash__btn"
            disabled={config.windStations.length >= MAX_WIND_STATIONS}
            onClick={() =>
              patchFrom((current) => {
                const station = createWindStation(current.windStations);
                return station ? { windStations: [...current.windStations, station] } : {};
              })
            }
          >
            Add
          </button>
        </div>
      </div>
      <p className="dash__hint">2D stations like sparse wind data: heading/speed for stream, spin for vorticity. Live weather files stay later.</p>
      {config.windStations.map((station) => {
        const liveStation = live.windStations.find((item) => item.id === station.id) ?? station;
        return (
          <article
            key={station.id}
            className="dash__item"
            data-selected={selectedId === station.id ? "true" : "false"}
            onClick={() => onSelect(station.id)}
          >
            <div className="dash__item-head">
              <input
                className="dash__input dash__text"
                type="text"
                maxLength={32}
                defaultValue={station.name}
                onBlur={(event) =>
                  patchFrom((current) => ({
                    windStations: current.windStations.map((item) =>
                      item.id === station.id ? { ...item, name: event.target.value } : item,
                    ),
                  }))
                }
              />
              <button
                type="button"
                className="dash__btn"
                onClick={(event) => {
                  event.stopPropagation();
                  patchFrom((current) => ({
                    windStations: current.windStations.filter((item) => item.id !== station.id),
                  }));
                }}
              >
                Remove
              </button>
            </div>
            <ToggleRow
              label="Enabled"
              help={WIND_FIELD_HELP.enabled}
              value={station.enabled}
              onChange={(enabled) => patchWind(patchFrom, station.id, { enabled })}
            />
            <WindRange
              station={station}
              liveStation={liveStation}
              config={config}
              field="uvX"
              label="U"
              help={WIND_FIELD_HELP.uvX}
              min={0}
              max={1}
              step={0.01}
              patchFrom={patchFrom}
            />
            <WindRange
              station={station}
              liveStation={liveStation}
              config={config}
              field="uvY"
              label="V"
              help={WIND_FIELD_HELP.uvY}
              min={0}
              max={1}
              step={0.01}
              patchFrom={patchFrom}
            />
            <WindRange
              station={station}
              liveStation={liveStation}
              config={config}
              field="heading"
              label="Heading"
              help={WIND_FIELD_HELP.heading}
              min={0}
              max={1}
              step={0.01}
              patchFrom={patchFrom}
            />
            <WindRange
              station={station}
              liveStation={liveStation}
              config={config}
              field="speed"
              label="Speed"
              help={WIND_FIELD_HELP.speed}
              min={0}
              max={1}
              step={0.01}
              patchFrom={patchFrom}
            />
            <WindRange
              station={station}
              liveStation={liveStation}
              config={config}
              field="spin"
              label="Spin"
              help={WIND_FIELD_HELP.spin}
              min={-1}
              max={1}
              step={0.01}
              patchFrom={patchFrom}
            />
            <WindRange
              station={station}
              liveStation={liveStation}
              config={config}
              field="radius"
              label="Radius"
              help={WIND_FIELD_HELP.radius}
              min={0.04}
              max={0.45}
              step={0.01}
              patchFrom={patchFrom}
            />
          </article>
        );
      })}
    </section>
  );
}

function patchWind(patchFrom: PatchFrom, id: string, patch: Partial<WindStation>): void {
  patchFrom((current) => ({
    windStations: current.windStations.map((item) => (item.id === id ? { ...item, ...patch } : item)),
  }));
}

function WindRange({
  station,
  liveStation,
  config,
  field,
  label,
  help,
  min,
  max,
  step,
  patchFrom,
}: {
  station: WindStation;
  liveStation: WindStation;
  config: FluidConfig;
  field: "uvX" | "uvY" | "heading" | "speed" | "spin" | "radius";
  label: string;
  help: string;
  min: number;
  max: number;
  step: number;
  patchFrom: PatchFrom;
}): ReactNode {
  const path = `windStations.${station.id}.${field}`;
  return (
    <RangeRow
      label={label}
      help={help}
      value={station[field]}
      live={liveStation[field]}
      min={min}
      max={max}
      step={step}
      driverName={driverNameForPath(config, path)}
      onChange={(value) => patchWind(patchFrom, station.id, { [field]: value })}
    />
  );
}
