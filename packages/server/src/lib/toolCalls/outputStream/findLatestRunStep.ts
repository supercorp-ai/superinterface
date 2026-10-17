import type { PrismaClient } from '@prisma/client'

// The run's most recent step, standing in for the step that called the tool.
export const findLatestRunStep = ({
  runId,
  prisma,
}: {
  runId: string
  prisma: PrismaClient
}) =>
  // TODO: get real run step id somehow
  prisma.runStep.findFirst({
    where: {
      runId,
    },
    orderBy: {
      createdAt: 'desc',
    },
  })
