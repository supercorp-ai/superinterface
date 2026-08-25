export type TaskSchedulerDuration =
  | number
  | `${bigint}d`
  | `${bigint}h`
  | `${bigint}m`
  | `${bigint}s`

export type TaskScheduler = {
  publishJSON: (options: {
    url: string
    body: Record<string, unknown>
    delay: number
    deduplicationId?: string
    retries?: number
    timeout?: TaskSchedulerDuration
  }) => Promise<{ messageId: string }>
  messages: {
    delete: (messageId: string) => Promise<void>
  }
}
