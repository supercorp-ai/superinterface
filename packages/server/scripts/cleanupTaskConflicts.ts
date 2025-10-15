import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { PrismaClient } from '@prisma/client'
import { qstash } from '@/lib/upstash/qstash'
import { FIFTEEN_MINUTES_IN_MS } from '@/lib/tasks/getTaskScheduleConflict'
import { TaskScheduleConflictError } from '@/lib/errors'
import { loadPrismaClient } from './utils/loadPrisma'

dayjs.extend(utc)

type CliOptions = {
  dryRun: boolean
}

const parseCliOptions = (): CliOptions => {
  const argv = process.argv.slice(2)
  const dryRun = !argv.some((arg) =>
    ['--force', '--no-dry-run', '--apply'].includes(arg),
  )

  return { dryRun }
}

type TaskWithDates = Awaited<
  ReturnType<PrismaClient['task']['findMany']>
>[number]

const getScheduleStart = (task: TaskWithDates) => {
  const start = (task.schedule as { start?: unknown } | null)?.start
  if (typeof start !== 'string') return null
  const parsed = dayjs(start).utc()
  return parsed.isValid() ? parsed : null
}

const getLastTouchedAt = (task: TaskWithDates) => {
  const updated = dayjs(task.updatedAt).utc()
  const created = dayjs(task.createdAt).utc()
  return updated.isAfter(created) ? updated : created
}

const cancelScheduledMessage = async ({
  task,
  dryRunLabel,
}: {
  task: TaskWithDates
  dryRunLabel: string
}) => {
  const messageId = task.qstashMessageId
  if (!messageId) {
    console.log(
      `${dryRunLabel} No scheduled message to cancel for task ${task.id}`,
    )
    return { status: 'none' as const }
  }

  if (process.env.NODE_ENV === 'test') {
    return { status: 'skipped_in_test' as const }
  }

  try {
    await qstash.messages.delete(messageId)
    console.log(
      `${dryRunLabel} Cancelled scheduled message ${messageId} for task ${task.id}`,
    )
    return { status: 'success' as const }
  } catch (error) {
    const status = (error as { status?: number }).status
    const message = (error as { message?: string }).message ?? String(error)
    if (status === 404 || message.includes('not found')) {
      console.warn(
        `${dryRunLabel} Scheduled message already absent (id=${messageId})`,
      )
      return { status: 'not_found' as const }
    }
    console.error(
      `${dryRunLabel} Failed to cancel scheduled message ${messageId}:`,
      message,
    )
    return { status: 'error' as const, error }
  }
}

const main = async () => {
  const prisma = await loadPrismaClient()
  const options = parseCliOptions()
  const dryRunLabel = options.dryRun ? '[DRY RUN]' : '[APPLY]'

  console.log(
    `${dryRunLabel} Starting duplicate task audit – ` +
      `${TaskScheduleConflictError.defaultMessage}`,
  )

  try {
    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: 'asc' },
    })

    const groups = new Map<string, TaskWithDates[]>()
    for (const task of tasks) {
      const key = `${task.threadId}::${task.key}`
      const list = groups.get(key) ?? []
      list.push(task)
      groups.set(key, list)
    }

    let conflictGroupCount = 0
    let candidateDeleteCount = 0

    for (const [groupKey, taskGroup] of groups.entries()) {
      if (taskGroup.length < 2) continue

      const sortedByStart = taskGroup
        .map((task) => ({
          task,
          start: getScheduleStart(task),
        }))
        .sort((a, b) => {
          if (!a.start && !b.start) return 0
          if (!a.start) return 1
          if (!b.start) return -1
          return a.start.valueOf() - b.start.valueOf()
        })

      const validEntries = sortedByStart
        .map((entry, index) => ({ ...entry, index }))
        .filter((entry): entry is typeof entry & { start: dayjs.Dayjs } => {
          if (!entry.start) {
            console.log(
              `${dryRunLabel} Skipping task without valid start: ${entry.task.id}`,
            )
            return false
          }
          return true
        })

      if (validEntries.length < 2) continue

      const parent = Array.from({ length: validEntries.length }, (_, i) => i)
      const find = (i: number): number => {
        if (parent[i] === i) return i
        parent[i] = find(parent[i])
        return parent[i]
      }
      const union = (a: number, b: number) => {
        const rootA = find(a)
        const rootB = find(b)
        if (rootA === rootB) return
        parent[rootB] = rootA
      }

      for (let i = 0; i < validEntries.length; i += 1) {
        const current = validEntries[i]
        for (let j = i + 1; j < validEntries.length; j += 1) {
          const compare = validEntries[j]
          const diffMs = compare.start.diff(current.start)
          if (diffMs >= FIFTEEN_MINUTES_IN_MS) break
          if (Math.abs(diffMs) < FIFTEEN_MINUTES_IN_MS) {
            union(i, j)
          }
        }
      }

      const clusters = new Map<number, TaskWithDates[]>()
      for (let i = 0; i < validEntries.length; i += 1) {
        const root = find(i)
        const cluster = clusters.get(root) ?? []
        cluster.push(validEntries[i].task)
        clusters.set(root, cluster)
      }

      const overlapping = Array.from(clusters.values()).filter(
        (cluster) => cluster.length > 1,
      )
      if (!overlapping.length) continue

      conflictGroupCount += overlapping.length

      console.log(`\n${dryRunLabel} Conflict group: ${groupKey}`)

      for (const cluster of overlapping) {
        const evaluatedCluster = cluster.map((task) => ({
          task,
          start: getScheduleStart(task),
          lastTouchedAt: getLastTouchedAt(task),
        }))

        const keepCandidate = evaluatedCluster.reduce((latest, current) => {
          if (!latest) return current
          if (current.lastTouchedAt.isAfter(latest.lastTouchedAt)) {
            return current
          }
          return latest
        }, evaluatedCluster[0])

        const toDelete = evaluatedCluster.filter(
          (item) => item.task.id !== keepCandidate?.task.id,
        )

        candidateDeleteCount += toDelete.length

        console.log(
          `  Keep: ${keepCandidate?.task.id} (lastTouched: ${keepCandidate?.lastTouchedAt.toISOString()})`,
        )
        console.log('  Conflicting tasks:')
        for (const item of evaluatedCluster) {
          const statusSuffix = '⚠️ violates window'
          console.log(
            `    • ${item.task.id} | start=${item.start?.toISOString() ?? 'n/a'} | ` +
              `createdAt=${item.task.createdAt.toISOString()} | updatedAt=${item.task.updatedAt.toISOString()} ${statusSuffix}`,
          )
        }

        if (!options.dryRun) {
          for (const candidate of toDelete) {
            try {
              const cancelResult = await cancelScheduledMessage({
                task: candidate.task,
                dryRunLabel,
              })

              await prisma.task.delete({ where: { id: candidate.task.id } })
              console.log(
                `    Deleted: ${candidate.task.id} (qstash: ${candidate.task.qstashMessageId ?? 'none'} | cancel=${cancelResult.status})`,
              )
            } catch (error) {
              console.error(
                `    Failed to delete ${candidate.task.id}:`,
                (error as Error).message,
              )
            }
          }
        } else {
          for (const candidate of toDelete) {
            console.log(
              `    Would delete: ${candidate.task.id} (qstash: ${candidate.task.qstashMessageId ?? 'none'})`,
            )
          }
        }
      }
    }

    if (conflictGroupCount === 0) {
      console.log(`${dryRunLabel} No conflicting task groups detected.`)
    } else {
      console.log(
        `\n${dryRunLabel} Summary: ${conflictGroupCount} conflicting group(s); ` +
          `${candidateDeleteCount} task(s) marked for deletion.`,
      )
      if (options.dryRun) {
        console.log(
          `${dryRunLabel} Re-run with '--force' to delete and cancel scheduled jobs.`,
        )
      }
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error('Unhandled error while auditing tasks:', error)
  process.exitCode = 1
})
