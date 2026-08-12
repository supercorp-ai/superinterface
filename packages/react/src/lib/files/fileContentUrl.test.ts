import { describe, expect, test } from 'vitest'
import { fileContentUrl, fileIdsFromAnnotation } from './fileContentUrl'

describe('fileContentUrl', () => {
  test('keeps regular file URLs unchanged', () => {
    expect(
      fileContentUrl({
        baseUrl: '/api',
        variables: { assistantId: 'asst_1' },
        fileId: 'file_abc',
      }),
    ).toBe('/api/files/file_abc/contents?assistantId=asst_1')
  })

  test('adds a separate containerId for container files', () => {
    expect(
      fileContentUrl({
        baseUrl: '/api',
        variables: { assistantId: 'asst_1' },
        fileId: 'cfile_xyz',
        containerId: 'cntr_abc',
      }),
    ).toBe(
      '/api/files/cfile_xyz/contents?assistantId=asst_1&containerId=cntr_abc',
    )
  })
})

test('fileIdsFromAnnotation reads separate file and container ids', () => {
  expect(
    fileIdsFromAnnotation({
      type: 'file_path',
      file_path: {
        file_id: 'cfile_xyz',
        container_id: 'cntr_abc',
      },
    }),
  ).toEqual({ fileId: 'cfile_xyz', containerId: 'cntr_abc' })
})
