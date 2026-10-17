export const uniqueSorted = ({ values }: { values: number[] }) =>
  Array.from(new Set(values)).sort((a, b) => a - b)
