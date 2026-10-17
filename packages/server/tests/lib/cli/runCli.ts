import { execFile } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

const binPath = path.resolve(import.meta.dirname, '../../../bin/index.cjs')

// Runs the published `superinterface-server` bin in a scratch directory, so no
// project `.env` is loaded and the test database from the environment is used.
export const runCli = async ({ args }: { args: string[] }) => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'superinterface-cli-'))

  return new Promise<{ code: number; stdout: string; stderr: string }>(
    (resolve) => {
      execFile(
        process.execPath,
        [binPath, ...args],
        { cwd, env: process.env },
        (error, stdout, stderr) => {
          resolve({
            code: error ? Number(error.code ?? 1) : 0,
            stdout,
            stderr,
          })
        },
      )
    },
  )
}
