// A by-rule list only filters when it has entries.
export const nonEmptyList = <T>({ list }: { list: T[] | undefined }) =>
  Array.isArray(list) && list.length ? list : null
