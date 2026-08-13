import { expect, test } from 'vitest'
import type OpenAI from 'openai'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import { remarkAnnotation } from './remarkAnnotation'

const parse = (
  text: string,
  annotation: OpenAI.Beta.Threads.Messages.Annotation,
) => {
  const tree = unified().use(remarkParse).parse(text)
  remarkAnnotation({
    content: { type: 'text', text: { value: text, annotations: [annotation] } },
  })()(tree)
  return tree as any
}

const annotationFor = (text: string, url: string) =>
  ({
    type: 'file_path',
    text: '',
    start_index: text.indexOf(url),
    end_index: text.indexOf(url) + url.length,
    file_path: {
      file_id: 'cfile_xyz',
      container_id: 'cntr_abc',
    },
  }) as any

test('an annotated Markdown link keeps separate file and container ids', () => {
  const url = 'sandbox:/mnt/data/report.pdf'
  const text = `[Download](${url})`
  const tree = parse(text, annotationFor(text, url))
  const node = tree.children[0].children[0]

  expect(node.type).toBe('annotation')
  expect(
    JSON.parse(node.data.hProperties['data-annotation']).file_path,
  ).toEqual({ file_id: 'cfile_xyz', container_id: 'cntr_abc' })
})

test('an annotated Markdown image exposes the same ids to the img renderer', () => {
  const url = 'sandbox:/mnt/data/chart.png'
  const text = `![Chart](${url})`
  const tree = parse(text, annotationFor(text, url))
  const image = tree.children[0].children[0]

  expect(image.type).toBe('image')
  expect(
    JSON.parse(image.data.hProperties['data-file-annotation']).file_path,
  ).toEqual({ file_id: 'cfile_xyz', container_id: 'cntr_abc' })
})

test('does not annotate a Markdown image when the file path is outside it', () => {
  const imageUrl = 'https://example.com/chart.png'
  const fileUrl = 'sandbox:/mnt/data/report.pdf'
  const text = `![Chart](${imageUrl}) [Download](${fileUrl})`
  const tree = parse(text, annotationFor(text, fileUrl))
  const image = tree.children[0].children[0]

  expect(image.type).toBe('image')
  expect(image.data?.hProperties?.['data-file-annotation']).toBeUndefined()
})

test('does not bridge non-file annotations to Markdown images', () => {
  const url = 'sandbox:/mnt/data/chart.png'
  const text = `![Chart](${url})`
  const annotation = {
    type: 'file_citation',
    text: '【1:1†source】',
    start_index: text.indexOf(url),
    end_index: text.indexOf(url) + url.length,
    file_citation: { file_id: 'file_source' },
  } as any
  const tree = parse(text, annotation)
  const image = tree.children[0].children[0]

  expect(image.type).toBe('image')
  expect(image.data?.hProperties?.['data-file-annotation']).toBeUndefined()
})
