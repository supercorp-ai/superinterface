export const isJSON = (value: string) => {
  try {
    JSON.parse(value)
    return true
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return false
  }
}
