#!/usr/bin/env node
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('node:path')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { register, require: tsxRequire } = require('tsx/cjs/api')

register()

const cliPath = path.resolve(__dirname, '../scripts/cli.ts')

tsxRequire(cliPath, __filename)
