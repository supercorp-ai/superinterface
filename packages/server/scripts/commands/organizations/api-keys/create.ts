import type { PrismaClient } from '@prisma/client'
import {
  intro,
  outro,
  text,
  note,
  spinner as createSpinner,
  cancel,
  isCancel,
  select,
} from '@clack/prompts'
import { z } from 'zod'
import { CliError } from '../../../utils/errors'

export type CreateOrganizationApiKeyOptions = {
  prisma: PrismaClient
  organizationId?: string
  name?: string
}

const organizationIdSchema = z
  .string()
  .trim()
  .uuid('organization-id must be a valid UUID')
const keyNameSchema = z.string().trim().min(1, 'Name is required')

export const createOrganizationApiKey = async ({
  prisma,
  organizationId,
  name,
}: CreateOrganizationApiKeyOptions) => {
  intro('Create organization API key')

  let targetOrganizationId = organizationId?.trim()
  let organizationName: string | undefined

  if (targetOrganizationId) {
    const parsedOrgId = organizationIdSchema.safeParse(targetOrganizationId)

    if (!parsedOrgId.success) {
      cancel(parsedOrgId.error.issues[0]?.message ?? 'Invalid organization id')
      return
    }

    const organization = await prisma.organization.findUnique({
      where: { id: parsedOrgId.data },
      select: { id: true, name: true },
    })

    if (!organization) {
      cancel('No organization found for the provided id')
      return
    }

    targetOrganizationId = organization.id
    organizationName = organization.name
  } else {
    const organizations = await prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true },
      take: 25,
    })

    if (organizations.length === 0) {
      cancel('No organizations exist yet. Create one first.')
      return
    }

    const selection = await select({
      message: 'Select organization',
      options: organizations.map((org) => ({
        value: org.id,
        label: `${org.name || '(unnamed)'} · ${org.id}`,
      })),
    })

    if (isCancel(selection)) {
      cancel('No API key created')
      return
    }

    const selected = organizations.find((org) => org.id === selection)

    if (!selected) {
      cancel('No API key created')
      return
    }

    targetOrganizationId = selected.id
    organizationName = selected.name
  }

  if (!targetOrganizationId) {
    cancel('No API key created')
    return
  }

  let keyName = name?.trim()

  if (!keyName) {
    const input = await text({
      message: 'API key name',
      placeholder: 'Production key',
      validate: (value) => {
        const parsed = keyNameSchema.safeParse(value)
        return parsed.success
          ? undefined
          : (parsed.error.issues[0]?.message ?? 'Invalid name')
      },
    })

    if (!input || isCancel(input)) {
      cancel('No API key created')
      return
    }

    keyName = input
  }

  const parsedName = keyNameSchema.safeParse(keyName)

  if (!parsedName.success) {
    cancel(parsedName.error.issues[0]?.message ?? 'Name is required')
    return
  }

  const spinner = createSpinner()
  spinner.start('Creating organization API key')

  try {
    const apiKey = await prisma.organizationApiKey.create({
      data: {
        organizationId: targetOrganizationId,
        name: parsedName.data,
      },
    })

    spinner.stop('Organization API key created')

    note(
      [
        `id: ${apiKey.id}`,
        `name: ${apiKey.name}`,
        `organizationId: ${apiKey.organizationId}`,
        `organizationName: ${organizationName ?? '(unnamed)'}`,
        `value: ${apiKey.value}`,
        `createdAt: ${apiKey.createdAt.toISOString()}`,
      ].join('\n'),
      'Organization API Key',
    )

    outro('Done')
  } catch (error) {
    spinner.stop('Creation failed')
    throw new CliError('Failed to create organization API key.', {
      cause: error,
    })
  }
}
