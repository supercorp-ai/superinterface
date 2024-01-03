import { InfiniteData } from '@tanstack/react-query'
import { RunsPage, Run } from '@/types'

type Args = {
  data: InfiniteData<RunsPage> | undefined
}

export const getRuns = ({
  data,
}: Args) => {
  if (!data) return []

  return data.pages.reduce<Run[]>((acc, page) => (
    acc.concat(page.data)
  ), [])
}
