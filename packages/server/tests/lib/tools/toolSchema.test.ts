import assert from 'node:assert'
import { describe, it } from 'node:test'
import { updateToolSchema } from '@/lib/tools/toolSchema'

const issuesOf = ({ body }: { body: unknown }) => {
  const result = updateToolSchema.safeParse(body)
  assert.strictEqual(result.success, false)
  return result.error!.issues.map(({ path, code }) => ({ path, code }))
}

const tooSmall = (path: string[]) => ({ path, code: 'too_small' })
const tooBig = (path: string[]) => ({ path, code: 'too_big' })

describe('updateToolSchema', () => {
  it('accepts settings within range', () => {
    assert.deepStrictEqual(
      updateToolSchema.safeParse({
        fileSearchTool: { vectorStoreIds: ['vs_1'], maxNumResults: 5 },
        imageGenerationTool: { partialImages: 0 },
        computerUseTool: { displayWidth: 1280, displayHeight: 720 },
      }).success,
      true,
    )
  })

  // Out-of-range settings are reported by the object schema and again by the
  // per-tool refinement, under the same path.
  it('reports out-of-range settings once per schema and once per refinement', () => {
    assert.deepStrictEqual(
      issuesOf({
        body: { fileSearchTool: { vectorStoreIds: [], maxNumResults: -5 } },
      }),
      [
        tooSmall(['fileSearchTool', 'maxNumResults']),
        tooSmall(['fileSearchTool', 'maxNumResults']),
      ],
    )
    assert.deepStrictEqual(
      issuesOf({ body: { imageGenerationTool: { partialImages: -1 } } }),
      [
        tooSmall(['imageGenerationTool', 'partialImages']),
        tooSmall(['imageGenerationTool', 'partialImages']),
      ],
    )
    assert.deepStrictEqual(
      issuesOf({
        body: { computerUseTool: { displayWidth: 5000, displayHeight: 720 } },
      }),
      [
        tooBig(['computerUseTool', 'displayWidth']),
        tooBig(['computerUseTool', 'displayWidth']),
      ],
    )
  })
})
