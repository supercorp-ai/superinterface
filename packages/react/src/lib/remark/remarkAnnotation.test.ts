import { describe, expect, test } from 'vitest'
import type OpenAI from 'openai'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import { remarkAnnotation } from './remarkAnnotation'

const parseWithAnnotation = (
  text: string,
  annotations: OpenAI.Beta.Threads.Messages.Annotation[] = [],
) => {
  const content = {
    type: 'text' as const,
    text: { value: text, annotations },
  }
  const tree = unified().use(remarkParse).parse(text)
  const plugin = remarkAnnotation({ content })
  plugin()(tree)
  return tree
}

const findNodes = (tree: any, type: string): any[] => {
  const results: any[] = []
  const walk = (node: any) => {
    if (node.type === type) results.push(node)
    if (node.children) node.children.forEach(walk)
  }
  walk(tree)
  return results
}

describe('remarkAnnotation', () => {
  test('text without annotations passes through unchanged', () => {
    const tree = parseWithAnnotation('Hello world')
    const textNodes = findNodes(tree, 'text')
    expect(textNodes).toHaveLength(1)
    expect(textNodes[0].value).toBe('Hello world')
    expect(findNodes(tree, 'annotation')).toHaveLength(0)
  })

  test('text with empty annotations array passes through unchanged', () => {
    const tree = parseWithAnnotation('Hello world', [])
    const textNodes = findNodes(tree, 'text')
    expect(textNodes).toHaveLength(1)
    expect(textNodes[0].value).toBe('Hello world')
  })

  test('creates annotation node for file_citation', () => {
    const text = 'See the source file for details.'
    const annotation = {
      type: 'file_citation' as const,
      text: 'source file',
      start_index: 8,
      end_index: 19,
      file_citation: { file_id: 'file-123' },
    }

    const tree = parseWithAnnotation(text, [annotation as any])
    const annotationNodes = findNodes(tree, 'annotation')

    expect(annotationNodes).toHaveLength(1)
    expect(annotationNodes[0].value).toBe('source file')
    expect(annotationNodes[0].data.hName).toBe('annotation')

    const parsedData = JSON.parse(
      annotationNodes[0].data.hProperties['data-annotation'],
    )
    expect(parsedData.type).toBe('file_citation')
    expect(parsedData.file_citation.file_id).toBe('file-123')
  })

  test('creates annotation node for file_path', () => {
    const text = 'Download the file here.'
    const annotation = {
      type: 'file_path' as const,
      text: 'file',
      start_index: 13,
      end_index: 17,
      file_path: { file_id: 'file-456' },
    }

    const tree = parseWithAnnotation(text, [annotation as any])
    const annotationNodes = findNodes(tree, 'annotation')

    expect(annotationNodes).toHaveLength(1)
    expect(annotationNodes[0].value).toBe('file')
  })

  test('splits text node around annotation', () => {
    const text = 'before annotated after'
    const annotation = {
      type: 'file_citation' as const,
      text: 'annotated',
      start_index: 7,
      end_index: 16,
      file_citation: { file_id: 'file-1' },
    }

    const tree = parseWithAnnotation(text, [annotation as any])
    const paragraph = tree.children[0]
    const childTypes = paragraph.children.map((c: any) => c.type)

    expect(childTypes).toContain('text')
    expect(childTypes).toContain('annotation')

    const textNodes = paragraph.children.filter((c: any) => c.type === 'text')
    const textValues = textNodes.map((n: any) => n.value)
    expect(textValues).toContain('before ')
    expect(textValues).toContain(' after')
  })

  test('handles multiple annotations in one text', () => {
    const text = 'first second third'
    const annotations = [
      {
        type: 'file_citation' as const,
        text: 'first',
        start_index: 0,
        end_index: 5,
        file_citation: { file_id: 'file-a' },
      },
      {
        type: 'file_citation' as const,
        text: 'third',
        start_index: 13,
        end_index: 18,
        file_citation: { file_id: 'file-b' },
      },
    ]

    const tree = parseWithAnnotation(text, annotations as any[])
    const annotationNodes = findNodes(tree, 'annotation')
    expect(annotationNodes).toHaveLength(2)
    expect(annotationNodes[0].value).toBe('first')
    expect(annotationNodes[1].value).toBe('third')
  })

  test('annotation at start of text', () => {
    const text = 'annotated rest of text'
    const annotation = {
      type: 'file_citation' as const,
      text: 'annotated',
      start_index: 0,
      end_index: 9,
      file_citation: { file_id: 'file-1' },
    }

    const tree = parseWithAnnotation(text, [annotation as any])
    const annotationNodes = findNodes(tree, 'annotation')
    expect(annotationNodes).toHaveLength(1)
    expect(annotationNodes[0].value).toBe('annotated')
  })

  test('annotation at end of text', () => {
    const text = 'some text annotated'
    const annotation = {
      type: 'file_citation' as const,
      text: 'annotated',
      start_index: 10,
      end_index: 19,
      file_citation: { file_id: 'file-1' },
    }

    const tree = parseWithAnnotation(text, [annotation as any])
    const annotationNodes = findNodes(tree, 'annotation')
    expect(annotationNodes).toHaveLength(1)
    expect(annotationNodes[0].value).toBe('annotated')
  })

  test('annotation that does not overlap any text node is ignored', () => {
    const text = 'Hello'
    const annotation = {
      type: 'file_citation' as const,
      text: 'other',
      start_index: 100,
      end_index: 110,
      file_citation: { file_id: 'file-1' },
    }

    const tree = parseWithAnnotation(text, [annotation as any])
    const annotationNodes = findNodes(tree, 'annotation')
    expect(annotationNodes).toHaveLength(0)
  })

  test('link without matching URL annotation passes through', () => {
    const text = 'Visit [example](https://example.com) for more.'
    const tree = parseWithAnnotation(text, [])
    const linkNodes = findNodes(tree, 'link')
    expect(linkNodes).toHaveLength(1)
    expect(linkNodes[0].url).toBe('https://example.com')
  })

  test('link with matching URL annotation becomes annotation node', () => {
    const text = 'Visit [example](https://example.com) for more.'
    const annotation = {
      type: 'file_path' as const,
      text: 'https://example.com',
      start_index: 16,
      end_index: 35,
      file_path: { file_id: 'file-link' },
    }

    const tree = parseWithAnnotation(text, [annotation as any])
    const annotationNodes = findNodes(tree, 'annotation')
    expect(annotationNodes).toHaveLength(1)
    expect(annotationNodes[0].value).toBe('https://example.com')
  })

  test('multiline text with annotation', () => {
    const text = 'Line one.\n\nLine two with citation here.'
    const annotation = {
      type: 'file_citation' as const,
      text: 'citation',
      start_index: 25,
      end_index: 33,
      file_citation: { file_id: 'file-ml' },
    }

    const tree = parseWithAnnotation(text, [annotation as any])
    const annotationNodes = findNodes(tree, 'annotation')
    expect(annotationNodes).toHaveLength(1)
    expect(annotationNodes[0].value).toBe('citation')
  })
})
