// Fails CI when the latest supercov run in the current directory did not pass
// or its coverage is below the given floors.
// Usage: node checkCoverage.mjs --lines 100 --branches 100 --mcdc 100
import { execFileSync } from 'node:child_process'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    lines: { type: 'string', default: '100' },
    branches: { type: 'string', default: '100' },
    mcdc: { type: 'string', default: '100' },
  },
})

const output = execFileSync(
  'npx',
  [
    '-y',
    `supercov@${process.env.SUPERCOV_VERSION}`,
    'runs',
    'latest',
    '--json',
  ],
  { encoding: 'utf8' },
)
const { data } = JSON.parse(output)

const failures = []

if (data.testExitCode !== 0) {
  failures.push(`the test command exited with ${data.testExitCode}`)
}
if (!data.valid || data.stale) {
  failures.push('the coverage run is not valid for the current source')
}

const metrics = {
  lines: data.coverage.lines.percentage,
  branches: data.coverage.branches.percentage,
  mcdc: data.coverage.conditionCoveragePct,
}

for (const [name, actual] of Object.entries(metrics)) {
  const floor = Number(values[name])
  const status = actual >= floor ? 'ok' : 'below the floor'
  console.log(`${name}: ${actual}% (floor ${floor}%) ${status}`)
  if (actual < floor) failures.push(`${name} ${actual}% < ${floor}%`)
}

if (failures.length) {
  console.error(`Coverage check failed: ${failures.join('; ')}`)
  process.exit(1)
}
