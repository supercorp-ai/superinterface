import { isEmpty } from 'radash'

export const formatName = ({ name }: { name: string | undefined | null }) => {
  if (isEmpty(name)) {
    return 'Untitled assistant'
  }

  return name ?? 'Untitled assistant'
}
