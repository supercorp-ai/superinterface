import { builtinEnvironments, type Environment } from 'vitest/environments'

// jsdom replaces AbortController/AbortSignal with its own, and Node's fetch
// rejects those signals ("Expected signal to be an instance of AbortSignal").
// The e2e tests talk to a real server through Node's fetch, so keep Node's.
export default <Environment>{
  name: 'jsdom-with-node-fetch',
  transformMode: 'web',
  async setup(global, options) {
    const { AbortController, AbortSignal } = globalThis
    const jsdom = await builtinEnvironments.jsdom.setup(global, options)

    global.AbortController = AbortController
    global.AbortSignal = AbortSignal

    return jsdom
  },
}
