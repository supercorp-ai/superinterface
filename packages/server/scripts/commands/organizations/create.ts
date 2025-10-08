import type { PrismaClient } from '@prisma/client'
import {
  intro,
  outro,
  text,
  note,
  spinner as createSpinner,
  cancel,
  isCancel,
} from '@clack/prompts'
import { z } from 'zod'
import { CliError } from '../../utils/errors'

export type CreateOrganizationOptions = {
  prisma: PrismaClient
  name?: string
}

const nameSchema = z.string().trim().min(1, 'Name is required')

export const createOrganization = async ({
  name,
  prisma,
}: CreateOrganizationOptions) => {
  intro('Create organization')

  let organizationName = name?.trim()

  if (!organizationName) {
    const input = await text({
      message: 'Organization name',
      placeholder: 'Acme Inc',
      validate: (value) => {
        const parsed = nameSchema.safeParse(value)
        return parsed.success
          ? undefined
          : (parsed.error.issues[0]?.message ?? 'Invalid name')
      },
    })

    if (!input || isCancel(input)) {
      cancel('No organization created')
      return
    }

    organizationName = input
  }

  const parsedName = nameSchema.safeParse(organizationName)

  if (!parsedName.success) {
    cancel(parsedName.error.issues[0]?.message ?? 'Name is required')
    return
  }

  const spinner = createSpinner()
  spinner.start('Creating organization')

  try {
    const organization = await prisma.organization.create({
      data: {
        name: parsedName.data,
      },
    })

    spinner.stop('Organization created')

    note(
      [
        `id: ${organization.id}`,
        `name: ${organization.name}`,
        `createdAt: ${organization.createdAt.toISOString()}`,
      ].join('\n'),
      'Organization',
    )

    outro('Done')
  } catch (error) {
    spinner.stop('Creation failed')
    throw new CliError('Failed to create organization.', { cause: error })
  }
}
