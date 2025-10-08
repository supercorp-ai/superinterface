#!/usr/bin/env node
import process from 'node:process'
import type { PrismaClient } from '@prisma/client'
import { Command } from 'commander'
import { createOrganization } from './commands/organizations/create'
import { createOrganizationApiKey } from './commands/organizations/api-keys/create'
import { runServer } from './commands/run/server'
import { CliError } from './utils/errors'
import { ensureEnv, ensureDatabaseUrl } from './utils/env'

const program = new Command()
  .name('@superinterface/server')
  .description('Administrative helpers for @superinterface/server')
  .showHelpAfterError('(add --help for additional information)')

type ActionOptions<Options> = Options & { prisma: PrismaClient }

const handleCliError = (error: unknown) => {
  if (error instanceof CliError) {
    console.error(error.message)
    if (error.cause) {
      console.error(error.cause)
    }
  } else {
    console.error(error)
  }
  process.exitCode = 1
}

const withAction = <Options extends Record<string, unknown>>(
  action: (options: ActionOptions<Options>) => Promise<void>,
) => {
  return async (options: Options) => {
    let prisma: PrismaClient | undefined

    try {
      await ensureEnv()
      ensureDatabaseUrl()

      const prismaModule = await import('../src/lib/prisma')
      prisma = prismaModule.prisma

      const actionOptions = { ...options, prisma } as ActionOptions<Options>

      await action(actionOptions)
    } catch (error) {
      handleCliError(error)
    } finally {
      await prisma?.$disconnect()
    }
  }
}

const organizations = program
  .command('organizations')
  .description('Manage organizations')

organizations
  .command('create')
  .description('Create a new organization')
  .option('-n, --name <name>', 'Organization display name')
  .action(withAction(createOrganization))

const organizationApiKeys = organizations
  .command('api-keys')
  .description('Manage organization API keys')

organizationApiKeys
  .command('create')
  .description('Create a new organization API key')
  .option('-o, --organization-id <organizationId>', 'Organization UUID')
  .option('-n, --name <name>', 'API key display name')
  .action(withAction(createOrganizationApiKey))

const run = program.command('run').description('Run local services')

run
  .command('server')
  .description('Start the server runtime')
  .option('-r, --runtime <runtime>', 'Runtime driver (default: next)', 'next')
  .option('-p, --port <port>', 'Port to listen on')
  .action(async (options: { runtime?: string; port?: string }) => {
    try {
      const portOption = options.port
      let parsedPort: number | undefined

      if (typeof portOption === 'string') {
        const port = Number.parseInt(portOption, 10)
        if (!Number.isInteger(port) || port <= 0) {
          throw new CliError('Port must be a positive integer.')
        }
        parsedPort = port
      }

      await runServer({
        runtime: options.runtime,
        port: parsedPort,
      })
    } catch (error) {
      handleCliError(error)
    }
  })

if (process.argv.length <= 2) {
  program.outputHelp()
}

program.parseAsync(process.argv).catch((error) => {
  handleCliError(error)
})
