import { describe, expect, test } from 'vitest'
import {
  fileContentUrl,
  fileReference,
  fileReferenceFromAnnotation,
} from './fileContentUrl'

describe('fileReference', () => {
  test('creates a regular file reference without a container id', () => {
    expect(fileReference({ fileId: 'file-abc' })).toEqual({
      source: 'file',
      fileId: 'file-abc',
    })
  })

  test('creates a container reference with separate ids', () => {
    expect(
      fileReference({ fileId: 'cfile_xyz', containerId: 'cntr_abc' }),
    ).toEqual({
      source: 'container',
      fileId: 'cfile_xyz',
      containerId: 'cntr_abc',
    })
  })
})

describe('fileReferenceFromAnnotation', () => {
  test('reads separate container and file ids from a file_path annotation', () => {
    expect(
      fileReferenceFromAnnotation({
        type: 'file_path',
        file_path: {
          file_id: 'cfile_xyz',
          container_id: 'cntr_abc',
        },
      }),
    ).toEqual({
      source: 'container',
      fileId: 'cfile_xyz',
      containerId: 'cntr_abc',
    })
  })

  test('supports a regular Assistants file_path annotation', () => {
    expect(
      fileReferenceFromAnnotation({
        type: 'file_path',
        file_path: { file_id: 'file_abc' },
      }),
    ).toEqual({ source: 'file', fileId: 'file_abc' })
  })

  test.each([
    null,
    {},
    { type: 'file_citation', file_path: { file_id: 'file_abc' } },
    { type: 'file_path', file_path: {} },
    {
      type: 'file_path',
      file_path: { file_id: 'cfile_xyz', container_id: 123 },
    },
  ])('rejects malformed annotations: %j', (annotation) => {
    expect(fileReferenceFromAnnotation(annotation)).toBeNull()
  })
})

describe('fileContentUrl', () => {
  test('keeps regular Assistants file URLs unchanged', () => {
    expect(
      fileContentUrl({
        baseUrl: 'https://api.example.com',
        variables: { assistantId: 'asst_1', publicApiKey: 'pk_1' },
        reference: fileReference({ fileId: 'file-abc' }),
      }),
    ).toBe(
      'https://api.example.com/files/file-abc/contents?assistantId=asst_1&publicApiKey=pk_1',
    )
  })

  test('adds containerId as its own query parameter', () => {
    expect(
      fileContentUrl({
        baseUrl: 'https://api.example.com',
        variables: { assistantId: 'asst_1' },
        reference: fileReference({
          fileId: 'cfile_xyz',
          containerId: 'cntr_abc',
        }),
      }),
    ).toBe(
      'https://api.example.com/files/cfile_xyz/contents?assistantId=asst_1&containerId=cntr_abc',
    )
  })

  test('does not leave a trailing question mark without variables', () => {
    expect(
      fileContentUrl({
        baseUrl: '/api',
        variables: undefined,
        reference: fileReference({ fileId: 'file-abc' }),
      }),
    ).toBe('/api/files/file-abc/contents')
  })

  test('URL-encodes the file id without combining it with container id', () => {
    expect(
      fileContentUrl({
        baseUrl: '/api',
        variables: undefined,
        reference: fileReference({
          fileId: 'cfile with spaces',
          containerId: 'cntr:a/b',
        }),
      }),
    ).toBe('/api/files/cfile%20with%20spaces/contents?containerId=cntr%3Aa%2Fb')
  })
})
