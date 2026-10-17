import { readFile } from 'node:fs/promises'
import path from 'node:path'

const distDir = path.resolve(__dirname, '../../../dist')

// A classic script that mounts like the @superinterface/javascript embeds:
// it carries the package's CommonJS build (as a bundler would inline it)
// and calls `rootElement` with `document.currentScript` while it runs.
// The element it gets back is marked with `data-mounted`.
export const embedScript = async () => {
  const build = await readFile(path.join(distDir, 'index.js'), 'utf8')

  return `(function () {
var module = { exports: {} }
var exports = module.exports
${build}
var element = module.exports.rootElement({ currentScript: document.currentScript })
element.setAttribute('data-mounted', '')
})()
`
}
