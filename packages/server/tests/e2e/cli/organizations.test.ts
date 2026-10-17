import assert from 'node:assert'
import { randomUUID } from 'node:crypto'
import { describe, it } from 'node:test'
import { prisma } from '@/lib/prisma'
import { runCli } from '../../lib/cli/runCli'

describe('superinterface-server CLI', () => {
  it('creates an organization and an organization API key', async () => {
    const organizationName = `CLI Org ${randomUUID()}`

    const createOrganization = await runCli({
      args: ['organizations', 'create', '--name', organizationName],
    })

    assert.strictEqual(createOrganization.code, 0, createOrganization.stderr)

    const organization = await prisma.organization.findFirstOrThrow({
      where: { name: organizationName },
    })
    assert.match(createOrganization.stdout, new RegExp(organization.id))

    const createApiKey = await runCli({
      args: [
        'organizations',
        'api-keys',
        'create',
        '--organization-id',
        organization.id,
        '--name',
        'CLI key',
      ],
    })

    assert.strictEqual(createApiKey.code, 0, createApiKey.stderr)

    const apiKey = await prisma.organizationApiKey.findFirstOrThrow({
      where: { organizationId: organization.id },
    })
    assert.strictEqual(apiKey.name, 'CLI key')
    assert.match(createApiKey.stdout, new RegExp(apiKey.value))
  })

  it('prints help', async () => {
    const result = await runCli({ args: ['--help'] })

    assert.strictEqual(result.code, 0)
    assert.match(result.stdout, /Administrative helpers/)
    assert.match(result.stdout, /organizations/)
  })
})
