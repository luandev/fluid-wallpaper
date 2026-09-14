import { VALUE_EMITTER_STUB_KINDS, type ValueEmitterKind } from "../app/config";

export function kindLabel(kind: ValueEmitterKind): string {
  if (kind === "audioPulse") {
    return "audio pulse";
  }
  if (kind === "audioSpectrum") {
    return "audio spectrum";
  }
  if ((VALUE_EMITTER_STUB_KINDS as readonly string[]).includes(kind)) {
    return `${kind} (later)`;
  }
  return kind;
}
