/**
 * `remarkAnnotation` × Responses-API `file_path` annotations.
 *
 * supercompat maps OpenAI Responses API `container_file_citation`
 * annotations into Assistants API `file_path` annotations whose `text` is
 * intentionally empty (Responses-API annotations are position-based via
 * `start_index`/`end_index`, not text-substring-based like the Assistants
 * API `file_citation` markers).
 *
 * Historical bug: `hasBrokenAnnotations` was scoped to all annotations and
 * fired on any empty `text`, so the broken-fallback branch would filter out
 * every empty-text `file_path` and dump it into a detached `<annotation/>`
 * paragraph at the end — the markdown links kept their raw `sandbox:` hrefs.
 *
 * Fix: scope `hasBrokenAnnotations` (and the broken-branch filters) to
 * `file_citation` annotations only. Empty-text `file_path` annotations now
 * flow through the position-based path and become inline annotation nodes
 * that wrap the markdown link, exposing them to `FilePathAnnotation` for
 * URL rewriting.
 */
import { describe, expect, test } from 'vitest'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import { remarkAnnotation } from './remarkAnnotation'
import type { MessageAnnotation } from '@/types'

const parseWithAnnotation = (
  text: string,
  annotations: MessageAnnotation[] = [],
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

describe('remarkAnnotation — Responses API file_path annotations', () => {
  const text =
    'Here are the files:\n\n' +
    '- [Download note_alpha.txt](sandbox:/mnt/data/note_alpha.txt)\n' +
    '- [Download note_beta.txt](sandbox:/mnt/data/note_beta.txt)\n' +
    '- [Download note_gamma.txt](sandbox:/mnt/data/note_gamma.txt)'

  // Indices for each sandbox URL substring inside the text — what supercompat
  // emits after mapping container_file_citation → file_path with empty text.
  const urls = [
    'sandbox:/mnt/data/note_alpha.txt',
    'sandbox:/mnt/data/note_beta.txt',
    'sandbox:/mnt/data/note_gamma.txt',
  ]

  const annotations: MessageAnnotation[] = urls.map((url, i) => {
    const start_index = text.indexOf(url)
    return {
      type: 'file_path' as const,
      text: '', // Responses-API style: empty
      start_index,
      end_index: start_index + url.length,
      file_path: { file_id: `cfile_alpha_${i}` },
    }
  })

  // An "inline" annotation node is one that REPLACES the URL inside an
  // existing link (it has children — the link label) and carries a position
  // pointing inside the original markdown source. Those are what
  // `FilePathAnnotation` actually renders to the user.
  //
  // An "appended" annotation node is one the broken-annotations fallback
  // pushes onto the end of the tree as an empty <annotation/> sibling — it
  // has no children and no position. Those don't replace the link, so the
  // user still clicks a raw sandbox: href.
  const isAppendedAnnotation = (node: any) =>
    !node.children || node.children.length === 0 || !node.position

  test('each sandbox URL becomes an inline annotation node', () => {
    const tree = parseWithAnnotation(text, annotations)

    const annotationNodes = findNodes(tree, 'annotation')
    const inline = annotationNodes.filter((n) => !isAppendedAnnotation(n))
    const appended = annotationNodes.filter(isAppendedAnnotation)

    expect(
      inline.length,
      'one inline annotation node per sandbox URL — these are what FilePathAnnotation renders',
    ).toBe(urls.length)
    expect(
      appended.length,
      'no detached/appended annotations — empty-text file_path is not "broken"',
    ).toBe(0)

    for (const node of inline) {
      const dataAnn = JSON.parse(node.data.hProperties['data-annotation'])
      expect(dataAnn.type).toBe('file_path')
      expect(dataAnn.file_path.file_id).toMatch(/^cfile_alpha_/)
    }
  })

  test('separate container_id and file_id fields round-trip into the annotation node', () => {
    const containerText =
      'Files:\n\n- [Download alpha](sandbox:/mnt/data/alpha.txt)'
    const url = 'sandbox:/mnt/data/alpha.txt'
    const start = containerText.indexOf(url)
    const containerAnnotations: MessageAnnotation[] = [
      {
        type: 'file_path',
        text: '',
        start_index: start,
        end_index: start + url.length,
        file_path: {
          file_id: 'cfile_xyz789',
          container_id: 'cntr_abc123',
        },
      },
    ]
    const tree = parseWithAnnotation(containerText, containerAnnotations)
    const inline = findNodes(tree, 'annotation').filter(
      (n) => !isAppendedAnnotation(n),
    )
    expect(inline.length).toBe(1)
    const dataAnn = JSON.parse(inline[0].data.hProperties['data-annotation'])
    expect(dataAnn.file_path).toEqual({
      file_id: 'cfile_xyz789',
      container_id: 'cntr_abc123',
    })
  })

  test('annotates a Markdown image URL for the custom img renderer', () => {
    const imageText =
      'Rendered inline:\n\n![Quarterly chart](sandbox:/mnt/data/chart.png)'
    const url = 'sandbox:/mnt/data/chart.png'
    const start = imageText.indexOf(url)
    const annotation: MessageAnnotation = {
      type: 'file_path',
      text: '',
      start_index: start,
      end_index: start + url.length,
      file_path: {
        file_id: 'cfile_chart',
        container_id: 'cntr_chart',
      },
    }

    const tree = parseWithAnnotation(imageText, [annotation])
    const images = findNodes(tree, 'image')

    expect(images).toHaveLength(1)
    expect(images[0].url).toBe(url)
    expect(
      JSON.parse(images[0].data.hProperties['data-file-annotation']),
    ).toEqual(annotation)
    expect(findNodes(tree, 'annotation')).toHaveLength(0)
  })

  test('leaves an unannotated Markdown image unchanged', () => {
    const imageText = '![Public chart](https://example.com/chart.png)'
    const tree = parseWithAnnotation(imageText)
    const images = findNodes(tree, 'image')

    expect(images).toHaveLength(1)
    expect(
      images[0].data?.hProperties?.['data-file-annotation'],
    ).toBeUndefined()
  })

  test('mixed text — sandbox URLs alongside non-link prose still resolve cleanly', () => {
    // Smoke test: previously the empty-text file_path annotation was treated
    // as "broken" and ALL annotations (including legitimate file_citations
    // present in the same message) were filtered out. Verify this no longer
    // happens.
    const mixed =
      'I generated a file. [Download](sandbox:/mnt/data/x.txt) Open it later.'
    const url = 'sandbox:/mnt/data/x.txt'
    const start = mixed.indexOf(url)
    const tree = parseWithAnnotation(mixed, [
      {
        type: 'file_path',
        text: '',
        start_index: start,
        end_index: start + url.length,
        file_path: { file_id: 'cfile_only' },
      },
    ])

    const inline = findNodes(tree, 'annotation').filter(
      (n) => !isAppendedAnnotation(n),
    )
    expect(inline.length).toBe(1)

    // The surrounding text should still render as text nodes, untouched.
    const allTextNodes = findNodes(tree, 'text')
    const allText = allTextNodes.map((n) => n.value).join(' ')
    expect(allText).toContain('I generated a file.')
    expect(allText).toContain('Open it later.')
  })

  test('control: a single file_citation 【…】 marker still works as before', () => {
    // Sanity check that the existing Azure-style 【…】 path still behaves —
    // we don't want to break it when fixing the file_path case.
    const txt = 'See the report 【4:0†doc.pdf】.'
    const marker = '【4:0†doc.pdf】'
    const start = txt.indexOf(marker)
    const ann: MessageAnnotation = {
      type: 'file_citation',
      text: marker,
      start_index: start,
      end_index: start + marker.length,
      file_citation: { file_id: 'file-doc' },
    }
    const tree = parseWithAnnotation(txt, [ann])
    const annotationNodes = findNodes(tree, 'annotation')
    expect(annotationNodes.length).toBeGreaterThan(0)
  })
})
