export const formatApiKeyName = ({
  name,
}: {
  name: string | undefined | null
}) => {
  if (!name) {
    return 'Untitled API key'
  }

  return name
}
