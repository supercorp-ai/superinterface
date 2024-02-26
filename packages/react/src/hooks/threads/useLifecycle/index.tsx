import { useManageRuns } from '@/hooks/runs/useManageRuns'
import { usePolling } from '@/hooks/runs/usePolling'
import { useManageActions } from '@/hooks/actions/useManageActions'

export const useLifecycle = () => {
  useManageRuns()
  useManageActions()
  usePolling()

  return null
}
