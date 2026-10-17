// The outcome of one task tool argument check. A failed check carries the
// message logged for the workspace and the error returned to the model.
export type TaskToolArgsCheck<Value> =
  | { ok: true; value: Value }
  | { ok: false; logMessage: string; error: string }
