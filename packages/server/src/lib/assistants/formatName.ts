export const formatName = ({ name }: { name: string | undefined | null }) => {
  if (!name) {
    return 'Untitled assistant'
  }

  return name
}
