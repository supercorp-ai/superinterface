// A missing by-rule list allows every value.
export const isAllowedValue = <T>({
  allowed,
  value,
}: {
  allowed: T[] | null | undefined
  value: T
}) => !allowed || allowed.includes(value)
