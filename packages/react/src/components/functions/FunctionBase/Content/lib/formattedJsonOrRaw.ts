export const formattedJsonOrRaw = ({ value }: { value: string | null }) => {
  try {
    return value ? JSON.stringify(JSON.parse(value), null, 2) : null
  } catch (error) {
    if (typeof value === 'string') {
      return value
    } else {
      return JSON.stringify(value, null, 2)
    }
  }
}
