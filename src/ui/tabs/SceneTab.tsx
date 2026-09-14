import type { ReactNode } from "react";
import {
  RESEED_KEYS,
  controlSchema,
  type ControlGroup,
  type FluidConfig,
} from "../../app/config";
import { driverNameForPath } from "../../app/drivers";
import { RangeRow, SelectRow, TextRow, ToggleRow } from "../rows";
import type { CommitConfig } from "../types";

const GROUPS: ControlGroup[] = ["Look", "Flow", "Composer", "Quality", "Input"];

export function SceneTab({
  config,
  live,
  commit,
}: {
  config: FluidConfig;
  live: FluidConfig;
  commit: CommitConfig;
}): ReactNode {
  return (
    <div className="dash__scene">
      <section className="dash__group">
        <h3 className="dash__group-title">Background</h3>
        <SelectRow
          label="Background"
          help="Video sits behind the ink. Colors render directly in the display pass without additional simulation work."
          value={config.backgroundMode}
          options={[
            { value: "video", label: "Music video" },
            { value: "solid", label: "Solid color" },
            { value: "gradient", label: "Gradient" },
            { value: "transparent", label: "Transparent" },
          ]}
          onChange={(value) =>
            commit({
              backgroundMode: value as FluidConfig["backgroundMode"],
              ...(value === "video" ? { videoReveal: 1 } : {}),
            })
          }
        />
        {(config.backgroundMode === "solid" ||
          config.backgroundMode === "gradient") && (
          <label>
            Background color{" "}
            <input
              type="color"
              value={config.backgroundColor}
              onChange={(event) =>
                commit({ backgroundColor: event.target.value })
              }
            />
          </label>
        )}
        {config.backgroundMode === "gradient" && (
          <label>
            Gradient end{" "}
            <input
              type="color"
              value={config.backgroundColorB}
              onChange={(event) =>
                commit({ backgroundColorB: event.target.value })
              }
            />
          </label>
        )}
        <h3 className="dash__group-title">Music</h3>
        <p className="dash__hint">
          Play the track, then Listen on Drivers with tab audio or a mic
          loopback. The iframe cannot feed the analyser.
        </p>
        <TextRow
          label="YouTube"
          help="Watch, youtu.be, shorts, or embed URL. Stored as a video id. Landing never mounts this player."
          placeholder="https://www.youtube.com/watch?v="
          value={config.youtubeUrl}
          onChange={(youtubeUrl) => commit({ youtubeUrl })}
        />
      </section>
      {GROUPS.map((group) => (
        <section key={group} className="dash__group">
          <h3 className="dash__group-title">{group}</h3>
          {controlSchema
            .filter((control) => control.group === group)
            .map((control) => {
              if (control.kind === "toggle") {
                return (
                  <ToggleRow
                    key={String(control.key)}
                    label={control.label}
                    help={control.help}
                    value={Boolean(config[control.key])}
                    onChange={(value) =>
                      commit({ [control.key]: value } as Partial<FluidConfig>)
                    }
                  />
                );
              }
              if (control.kind === "select") {
                return (
                  <SelectRow
                    key={String(control.key)}
                    label={control.label}
                    help={control.help}
                    value={String(config[control.key])}
                    options={control.options ?? []}
                    onChange={(value) =>
                      commit(
                        { [control.key]: value } as Partial<FluidConfig>,
                        Boolean(control.reseed),
                      )
                    }
                  />
                );
              }
              if (
                control.kind !== "range" ||
                control.min === undefined ||
                control.max === undefined
              ) {
                return null;
              }
              const path = String(control.key);
              return (
                <RangeRow
                  key={path}
                  label={control.label}
                  help={control.help}
                  value={Number(config[control.key])}
                  live={Number(live[control.key])}
                  min={control.min}
                  max={control.max}
                  step={control.step ?? 0.01}
                  driverName={driverNameForPath(config, path)}
                  onChange={(value) =>
                    commit(
                      { [control.key]: value } as Partial<FluidConfig>,
                      Boolean(control.reseed) || RESEED_KEYS.has(control.key),
                    )
                  }
                />
              );
            })}
        </section>
      ))}
    </div>
  );
}
