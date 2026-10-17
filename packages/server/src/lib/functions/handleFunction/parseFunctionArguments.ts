export type FunctionArguments = Record<string, unknown>

// Stands in for arguments the model left empty.
export const NO_ARGUMENTS = '{}'

type ParsedFunctionArguments =
  | { ok: true; args: FunctionArguments }
  | { ok: false; error: SyntaxError }

// Parses the JSON arguments the model sent with a function tool call.
export const parseFunctionArguments = ({
  json,
}: {
  json: string
}): ParsedFunctionArguments => {
  try {
    return { ok: true, args: JSON.parse(json) }
  } catch (e) {
    // JSON.parse only throws SyntaxError instances.
    return { ok: false, error: e as SyntaxError }
  }
}
