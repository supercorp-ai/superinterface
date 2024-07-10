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
    return value
  }
}
