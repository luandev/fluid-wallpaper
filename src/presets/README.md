# Preset runtime

Vite discovers JSON from the root presets collection and validates it at import. Each folder has exactly one versioned full preset and matching metadata. Invalid values, unresolved material/binding references, missing fields, optional media and mismatched IDs fail validation rather than being clamped silently. Catalog metadata is frozen; lookup functions return independent deep copies. No storage, DOM, capture images or React is included in this package entry.

The landing imports three existing IDs from here; docs and heroes share this same collection. See [contribution guide](../../docs/contributing-presets.html).
