import { useManageRuns } from '@/hooks/runs/useManageRuns'
import { usePolling } from '@/hooks/runs/usePolling'
import { useManageActions } from '@/hooks/actions/useManageActions'

type Args = {
  [key: string]: any
}

export const useThreadLifecycles = (args: Args) => {
  useManageRuns(args)
  useManageActions(args)
  usePolling(args)

  return null
}
