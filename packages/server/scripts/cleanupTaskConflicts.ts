import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import { PrismaClient } from '@prisma/client'
import { qstash } from '@/lib/upstash/qstash'
import { FIFTEEN_MINUTES_IN_MS } from '@/lib/tasks/getTaskScheduleConflict'
import { getScheduleOccurrences } from '@/lib/tasks/getScheduleOccurrences'
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

const LOOKAHEAD_DAYS = 365
const MAX_OCCURRENCES = 120

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

  if (!options.dryRun && !process.env.QSTASH_TOKEN) {
    console.error(
      `${dryRunLabel} Missing required environment variable QSTASH_TOKEN. Aborting.`,
    )
    await prisma.$disconnect()
    process.exitCode = 1
    return
  }

  console.log(
    `${dryRunLabel} Starting duplicate task audit – ` +
      `${TaskScheduleConflictError.defaultMessage}`,
  )

  try {
    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: 'asc' },
    })

    if (!tasks.length) {
      console.log(`${dryRunLabel} No tasks found – nothing to audit.`)
      return
    }

    const groups = new Map<string, TaskWithDates[]>()
    for (const task of tasks) {
      const key = `${task.threadId}::${task.key}`
      const list = groups.get(key) ?? []
      list.push(task)
      groups.set(key, list)
    }

    console.log(
      `${dryRunLabel} Loaded ${tasks.length} task(s) across ${groups.size} group(s).`,
    )

    let conflictGroupCount = 0
    let candidateDeleteCount = 0
    let processedTasks = 0
    let processedGroups = 0

    for (const [groupKey, taskGroup] of groups.entries()) {
      processedGroups += 1
      processedTasks += taskGroup.length

      const percentComplete = Math.round((processedTasks / tasks.length) * 100)
      if (
        processedGroups === 1 ||
        processedGroups === groups.size ||
        processedGroups % 10 === 0
      ) {
        console.log(
          `${dryRunLabel} Progress: ${processedTasks}/${tasks.length} task(s) checked (${percentComplete}%).`,
        )
      }

      if (taskGroup.length < 2) continue

      const occurrencesMap = new Map<string, dayjs.Dayjs[]>()

      const taskEntries = taskGroup
        .map((task) => {
          const occurrences = getScheduleOccurrences(
            task.schedule as PrismaJson.TaskSchedule,
            {
              lookAheadDays: LOOKAHEAD_DAYS,
              maxOccurrences: MAX_OCCURRENCES,
            },
          )
          occurrencesMap.set(task.id, occurrences)
          return {
            task,
            occurrences,
          }
        })
        .map((entry, index) => ({ ...entry, index }))

      const validEntries = taskEntries.filter((entry) => {
        if (!entry.occurrences.length) {
          console.log(
            `${dryRunLabel} Skipping task without upcoming occurrences: ${entry.task.id}`,
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

      const hasConflictWithinWindow = (a: dayjs.Dayjs[], b: dayjs.Dayjs[]) => {
        let i = 0
        let j = 0
        while (i < a.length && j < b.length) {
          const diff = a[i].valueOf() - b[j].valueOf()
          if (Math.abs(diff) < FIFTEEN_MINUTES_IN_MS) return true
          if (diff < 0) {
            i += 1
          } else {
            j += 1
          }
        }
        return false
      }

      for (let i = 0; i < validEntries.length; i += 1) {
        const current = validEntries[i]
        for (let j = i + 1; j < validEntries.length; j += 1) {
          const compare = validEntries[j]
          if (
            hasConflictWithinWindow(current.occurrences, compare.occurrences)
          ) {
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
          occurrences: occurrencesMap.get(task.id) ?? [],
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
          const nextOccurrence = item.occurrences[0]?.toISOString() ?? 'n/a'
          const preview =
            item.occurrences
              .slice(0, 3)
              .map((occurrence) => occurrence.toISOString())
              .join(', ') || 'n/a'
          const statusSuffix = '⚠️ violates window'
          console.log(
            `    • ${item.task.id} | next=${nextOccurrence} | upcoming=[${preview}] | ` +
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

              if (cancelResult.status === 'error') {
                throw new Error(
                  'QStash cancellation failed; rerun after resolving token/availability issues.',
                )
              }

              await prisma.task.delete({ where: { id: candidate.task.id } })
              console.log(
                `    Deleted: ${candidate.task.id} (qstash: ${candidate.task.qstashMessageId ?? 'none'} | cancel=${cancelResult.status})`,
              )
            } catch (error) {
              console.error(
                `    Failed to delete ${candidate.task.id}:`,
                (error as Error).message,
              )
              throw error
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
