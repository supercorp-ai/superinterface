#!/usr/bin/env node
const path = require('node:path')
const { register, require: tsxRequire } = require('tsx/cjs/api')

register()

const cliPath = path.resolve(__dirname, '../scripts/cli.ts')

tsxRequire(cliPath, __filename)
