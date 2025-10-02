declare module '../node_modules/undici-types/index.d.ts' {
  export * from 'undici-types'
}

declare module '../../node_modules/undici-types/index.d.ts' {
  export * from 'undici-types'
}

declare module '../node_modules/undici/index.d.ts' {
  export * from 'undici'
}

export type Run = import('openai').OpenAI.Beta.Threads.Runs.Run
