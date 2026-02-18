import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'
import { execSync, spawn, type ChildProcess } from 'node:child_process'
import {
  ApiKeyType,
  ModelProviderType,
  StorageProviderType,
  ToolType,
  TransportType,
} from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createTestWorkspace } from '../lib/workspaces/createTestWorkspace'
import { createTestModelProvider } from '../lib/modelProviders/createTestModelProvider'
import { createTestApiKey } from '../lib/apiKeys/createTestApiKey'
import { createTestAssistant } from '../lib/assistants/createTestAssistant'
import { buildPOST } from '@/app/api/messages/buildRoute'

const openrouterApiKey = process.env.TEST_OPENROUTER_API_KEY

// ---------------------------------------------------------------------------
// Docker configuration
// ---------------------------------------------------------------------------
const CONTAINER_NAME = 'computer-use-mcp-si-openrouter-test'
const DOCKER_IMAGE = 'computer-use-mcp-dev'
const MCP_PORT = 3105
const MCP_SERVER_URL = `http://localhost:${MCP_PORT}`
const DOCKER_CONTEXT_DIR =
  process.env.COMPUTER_USE_MCP_DIR ?? '../computer-use-mcp'
const DEFAULT_URL = 'https://supercorp.ai'
const HEALTH_TIMEOUT_MS = 60_000
const HEALTH_POLL_MS = 1_000

// ---------------------------------------------------------------------------
// Docker lifecycle helpers
// ---------------------------------------------------------------------------

function cleanupContainer() {
  try {
    execSync(`docker rm -f ${CONTAINER_NAME}`, { stdio: 'ignore' })
  } catch {}
}

function buildImage() {
  if (process.env.SKIP_DOCKER_BUILD === 'true') return
  // Skip build if the image already exists (e.g. built by supercompat tests)
  try {
    const id = execSync(`docker images -q ${DOCKER_IMAGE}`, {
      encoding: 'utf8',
    }).trim()
    if (id.length > 0) return
  } catch {}
  execSync(`docker build --platform=linux/amd64 -t ${DOCKER_IMAGE} .`, {
    cwd: DOCKER_CONTEXT_DIR,
    stdio: 'ignore',
  })
}

function startContainer(): ChildProcess {
  return spawn(
    'docker',
    [
      'run',
      '--rm',
      '--name',
      CONTAINER_NAME,
      '--platform',
      'linux/amd64',
      '-p',
      `${MCP_PORT}:8000`,
      DOCKER_IMAGE,
      '--transport',
      'http',
      '--toolSchema',
      'loose',
      '--defaultUrl',
      DEFAULT_URL,
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  )
}

async function waitForHealth(): Promise<void> {
  const deadline = Date.now() + HEALTH_TIMEOUT_MS
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${MCP_SERVER_URL}/healthz`)
      if (res.ok) return
    } catch {}
    await new Promise((r) => setTimeout(r, HEALTH_POLL_MS))
  }
  throw new Error(
    `Container did not become healthy within ${HEALTH_TIMEOUT_MS}ms`,
  )
}

/**
 * Warm up the MCP server: trigger the browser, wait for the defaultUrl to load.
 */
async function warmUp(): Promise<void> {
  const rpc = async (
    method: string,
    params: Record<string, any> = {},
    id = 1,
  ) => {
    const res = await fetch(MCP_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
    })
    const text = await res.text()
    const dataLine = text.split('\n').find((l) => l.startsWith('data: '))
    return dataLine ? JSON.parse(dataLine.slice(6)) : JSON.parse(text)
  }

  await rpc('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'si-test-warmup', version: '1.0' },
  })
  await rpc(
    'tools/call',
    { name: 'computer_call', arguments: { action: { type: 'screenshot' } } },
    2,
  )
  await new Promise((r) => setTimeout(r, 30_000))
  await rpc(
    'tools/call',
    { name: 'computer_call', arguments: { action: { type: 'screenshot' } } },
    3,
  )
}

/**
 * Collect all streaming events from a POST /api/messages response.
 */
async function collectEvents(response: Response) {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  const events: Array<{ event: string; data: any }> = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value, { stream: true })
    try {
      const event = JSON.parse(chunk)
      events.push(event)
    } catch {
      // Ignore non-JSON chunks
    }
  }

  return events
}

/**
 * Extract the final assistant text from collected events.
 */
function getAssistantText(events: Array<{ event: string; data: any }>): string {
  let text = ''
  for (const ev of events) {
    if (
      ev.event === 'thread.message.delta' &&
      ev.data?.delta?.content?.[0]?.text?.value
    ) {
      text += ev.data.delta.content[0].text.value
    }
  }
  return text
}

describe('OpenRouter GLM Computer Use', () => {
  let containerProcess: ChildProcess | undefined

  before(
    async () => {
      cleanupContainer()
      buildImage()
      containerProcess = startContainer()
      await waitForHealth()
      await warmUp()
    },
    { timeout: 180_000 },
  )

  after(async () => {
    try {
      execSync(`docker stop ${CONTAINER_NAME}`, { stdio: 'ignore' })
    } catch {}
    containerProcess?.kill()
  })

  it('should take screenshot via MCP and describe the page', async () => {
    if (!openrouterApiKey) {
      console.log('Skipping: TEST_OPENROUTER_API_KEY not set')
      return
    }

    const workspace = await createTestWorkspace()
    const modelProvider = await createTestModelProvider({
      data: {
        workspaceId: workspace.id,
        type: ModelProviderType.OPEN_ROUTER,
        apiKey: openrouterApiKey,
      },
    })

    const publicKey = await createTestApiKey({
      data: { workspaceId: workspace.id, type: ApiKeyType.PUBLIC },
    })

    const assistant = await createTestAssistant({
      data: {
        workspaceId: workspace.id,
        modelProviderId: modelProvider.id,
        modelSlug: 'z-ai/glm-4.6v',
        storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
        instructions:
          'You are a computer use assistant. You can control a computer with a browser. Use the computer_call tool to interact with it. When you see a page, describe the page title or main content you observe.',
      },
    })

    // Create MCP server with HTTP transport
    const mcpServer = await prisma.mcpServer.create({
      data: {
        name: 'Computer Use MCP',
        transportType: TransportType.HTTP,
        assistantId: assistant.id,
        httpTransport: {
          create: {
            url: MCP_SERVER_URL,
          },
        },
      },
    })

    // Create computer use tool linked to MCP server
    await prisma.tool.create({
      data: {
        type: ToolType.COMPUTER_USE,
        assistantId: assistant.id,
        computerUseTool: {
          create: {
            displayWidth: 1280,
            displayHeight: 720,
            mcpServerId: mcpServer.id,
          },
        },
      },
    })

    const postHandler = buildPOST({ prisma })

    const mockRequest = new Request('http://localhost:3000/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        publicApiKey: publicKey.value,
        assistantId: assistant.id,
        content:
          'Take a screenshot and tell me what website or page you see on the screen.',
      }),
    }) as any

    const response = await postHandler(mockRequest)
    assert.strictEqual(response.status, 200, 'Should return 200 status')

    const events = await collectEvents(response)

    // Verify the run did not fail
    const failedEvent = events.find((e) => e.event === 'thread.run.failed')
    assert.ok(
      !failedEvent,
      `Run should not fail: ${JSON.stringify(failedEvent?.data?.last_error)}`,
    )

    // Verify the model called computer_call (requires_action was emitted)
    const requiresActionEvent = events.find(
      (e) => e.event === 'thread.run.requires_action',
    )
    assert.ok(
      requiresActionEvent,
      'Should emit requires_action for computer_call',
    )

    // Verify the assistant actually described what it saw on the page
    const text = getAssistantText(events)
    console.log('GLM computer use response:', text.slice(0, 500))

    assert.ok(text.length > 0, 'Should receive assistant text response')

    const lower = text.toLowerCase()
    const seesPage =
      lower.includes('supercorp') ||
      lower.includes('accelerat') ||
      lower.includes('ai agent')
    assert.ok(
      seesPage,
      `Model should mention supercorp.ai content (got: "${text.slice(0, 300)}")`,
    )
  })
})
