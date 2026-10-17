const DAY_CODE_LENGTH = 2

const DAY_CODE_TO_INDEX: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
}

// Reads the weekday index from the last two letters, so ordinal codes such
// as '1MO' are read as 'MO'.
export const parseDayCode = ({ value }: { value: string }): number | null => {
  const code = value.slice(-DAY_CODE_LENGTH).toUpperCase()
  if (!Object.prototype.hasOwnProperty.call(DAY_CODE_TO_INDEX, code)) {
    return null
  }

  return DAY_CODE_TO_INDEX[code]
}
