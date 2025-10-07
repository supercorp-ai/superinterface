import { isEmpty } from 'radash'

export const formatApiKeyName = ({
  name,
}: {
  name: string | undefined | null
}) => {
  if (isEmpty(name)) {
    return 'Untitled API key'
  }

  return name ?? 'Untitled API key'
}
