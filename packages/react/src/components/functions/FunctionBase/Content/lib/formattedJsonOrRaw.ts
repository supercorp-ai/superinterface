export const formattedJsonOrRaw = ({
  value,
}: {
  value: string | null
}) => {
  if (!value) {
    return null
  }

  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch (error) {
    if (typeof value === 'string') {
      return value
    } else {
      return JSON.stringify(value, null, 2)
    }
  }
}
