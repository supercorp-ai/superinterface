/**
 * Native tools a storage / model provider cannot use must leave no entry in
 * the tools list (not `undefined` or `null`), so they are never sent to the
 * model.
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  ModelProviderType,
  StorageProviderType,
  ToolType,
} from '@prisma/client'
import { nativeTools } from '@/lib/tools/tools'

type NativeToolsAssistant = Parameters<typeof nativeTools>[0]['assistant']

const buildAssistant = ({
  modelProviderType,
  storageProviderType,
  tools,
}: {
  modelProviderType: ModelProviderType
  storageProviderType: StorageProviderType
  tools: object[]
}) =>
  ({
    id: 'assistant-id',
    workspaceId: 'workspace-id',
    storageProviderType,
    modelProvider: { type: modelProviderType },
    tools,
  }) as unknown as NativeToolsAssistant

describe('nativeTools — skipped tools leave no entry', () => {
  it('skips FILE_SEARCH outside Assistants API and Responses storage', () => {
    const result = nativeTools({
      assistant: buildAssistant({
        modelProviderType: ModelProviderType.ANTHROPIC,
        storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
        tools: [
          {
            id: 'tool-id',
            type: ToolType.FILE_SEARCH,
            fileSearchTool: { vectorStoreIds: ['vs_1'], maxNumResults: 5 },
          },
        ],
      }),
      useOpenaiComputerTool: false,
    })

    assert.deepEqual(result, [])
  })

  it('skips WEB_SEARCH for Assistants API storage with a non-Anthropic model', () => {
    const result = nativeTools({
      assistant: buildAssistant({
        modelProviderType: ModelProviderType.OPENAI,
        storageProviderType: StorageProviderType.OPENAI,
        tools: [
          {
            id: 'tool-id',
            type: ToolType.WEB_SEARCH,
            webSearchTool: {},
          },
        ],
      }),
      useOpenaiComputerTool: false,
    })

    assert.deepEqual(result, [])
  })
})
