import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'

// Computer use tests build and run a Docker image from `contextDir`. Returns
// why they can't run (no build context, no Docker), or undefined if they can.
export const dockerSkipReason = ({ contextDir }: { contextDir: string }) => {
  if (!existsSync(contextDir)) {
    return `Docker build context not found at ${contextDir} (set COMPUTER_USE_MCP_DIR)`
  }

  try {
    execSync('docker info', { stdio: 'ignore' })
    return undefined
  } catch {
    return 'Docker is not available'
  }
}
