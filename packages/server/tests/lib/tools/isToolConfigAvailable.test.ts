import {
  ModelProviderType,
  StorageProviderType,
  ToolType,
} from '@prisma/client'
import assert from 'node:assert'
import { describe, it } from 'node:test'
import { isToolConfigAvailable } from '../../../src/lib/tools/isToolConfigAvailable'

describe('isToolConfigAvailable', () => {
  describe('COMPUTER_USE', () => {
    it('is available for ANTHROPIC + SUPERINTERFACE_CLOUD', () => {
      assert.strictEqual(
        isToolConfigAvailable({
          toolType: ToolType.COMPUTER_USE,
          modelProviderType: ModelProviderType.ANTHROPIC,
          storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
        }),
        true,
      )
    })

    it('is available for OPENAI + OPENAI_RESPONSES', () => {
      assert.strictEqual(
        isToolConfigAvailable({
          toolType: ToolType.COMPUTER_USE,
          modelProviderType: ModelProviderType.OPENAI,
          storageProviderType: StorageProviderType.OPENAI_RESPONSES,
        }),
        true,
      )
    })

    it('is available for AZURE_OPENAI + AZURE_RESPONSES', () => {
      assert.strictEqual(
        isToolConfigAvailable({
          toolType: ToolType.COMPUTER_USE,
          modelProviderType: ModelProviderType.AZURE_OPENAI,
          storageProviderType: StorageProviderType.AZURE_RESPONSES,
        }),
        true,
      )
    })

    it('is available for OPEN_ROUTER + SUPERINTERFACE_CLOUD', () => {
      assert.strictEqual(
        isToolConfigAvailable({
          toolType: ToolType.COMPUTER_USE,
          modelProviderType: ModelProviderType.OPEN_ROUTER,
          storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
        }),
        true,
      )
    })

    it('is not available for OPEN_ROUTER + OPENAI_RESPONSES', () => {
      assert.strictEqual(
        isToolConfigAvailable({
          toolType: ToolType.COMPUTER_USE,
          modelProviderType: ModelProviderType.OPEN_ROUTER,
          storageProviderType: StorageProviderType.OPENAI_RESPONSES,
        }),
        false,
      )
    })

    it('is not available for GROQ + SUPERINTERFACE_CLOUD', () => {
      assert.strictEqual(
        isToolConfigAvailable({
          toolType: ToolType.COMPUTER_USE,
          modelProviderType: ModelProviderType.GROQ,
          storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
        }),
        false,
      )
    })
  })

  describe('IMAGE_GENERATION', () => {
    it('is not available for OPEN_ROUTER', () => {
      assert.strictEqual(
        isToolConfigAvailable({
          toolType: ToolType.IMAGE_GENERATION,
          modelProviderType: ModelProviderType.OPEN_ROUTER,
          storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
        }),
        false,
      )
    })
  })

  describe('WEB_SEARCH', () => {
    it('is not available for OPEN_ROUTER', () => {
      assert.strictEqual(
        isToolConfigAvailable({
          toolType: ToolType.WEB_SEARCH,
          modelProviderType: ModelProviderType.OPEN_ROUTER,
          storageProviderType: StorageProviderType.SUPERINTERFACE_CLOUD,
        }),
        false,
      )
    })
  })
})
