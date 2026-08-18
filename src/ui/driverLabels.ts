import { VALUE_EMITTER_STUB_KINDS, type ValueEmitterKind } from "../app/config";

export function kindLabel(kind: ValueEmitterKind): string {
  if ((VALUE_EMITTER_STUB_KINDS as readonly string[]).includes(kind)) {
    return `${kind} (later)`;
  }
  return kind;
}
